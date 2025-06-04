import * as fs from 'fs';
import * as path from 'path';
import { Config, AnthropicResponse, TurnMetadata, AIHandlerResult } from './types';
import { Logger } from './logger';
import { HistoryManager } from './history';
import { withRetry, DEFAULT_RETRY_OPTIONS } from './retry-utils';

export class AnthropicHandler {
  private config: Config;
  private logger: Logger;
  private historyManager: HistoryManager;
  private topic: string;
  
  constructor(config: Config, sessionId: string, turnNumber: number, topic: string) {
    this.config = config;
    this.topic = topic;
    
    const logDir = path.join(process.cwd(), 'logs');
    const anthropicLog = path.join(logDir, `${sessionId}_anthropic.log`);
    const historyFile = path.join(logDir, `${sessionId}_history.json`);
    
    this.logger = new Logger(anthropicLog, turnNumber);
    this.historyManager = new HistoryManager(historyFile, topic);
  }
  
  async processMessage(message: string, sessionId: string, turnNumber: number): Promise<AIHandlerResult> {
    this.logger.setTurnNumber(turnNumber);
    this.logger.log('INFO', 'Received message from conversation orchestrator');
    this.logger.log('INPUT', message);
    
    try {
      // Build messages with history
      const messages = this.historyManager.buildAnthropicMessages(message);
      
      // Prepare API request
      const payload = {
        model: this.config.ANTHROPIC_MODEL,
        max_tokens: 1000,
        system: `You are participating in a conversation with another AI about: ${this.topic}. This is an ongoing discussion - respond naturally and build upon what has been said before. Keep your responses concise but meaningful.`,
        messages
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': this.config.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      };
      
      this.logger.log('DEBUG', `Sending request to Anthropic API with ${messages.length} messages in history`);
      this.logger.log('DEBUG', `Model: ${this.config.ANTHROPIC_MODEL}`);
      
      // Make API call with retry logic
      const startTime = Date.now();
      
      const responseData = await withRetry(async () => {
        this.logger.log('DEBUG', 'Making API request to Anthropic...');
        
        const response = await fetch(`${this.config.ANTHROPIC_BASE_URL}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          this.logger.log('ERROR', `HTTP ${response.status}: ${errorText}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json() as AnthropicResponse;
      }, {
        ...DEFAULT_RETRY_OPTIONS,
        retries: 5 // Retry up to 5 times for rate limits
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.logger.log('DEBUG', `Response time: ${responseTime}ms (including retries)`);
      this.logger.log('INFO', 'Successfully received response from Anthropic');
      
      // Check for API errors
      if ('error' in responseData) {
        const errorMsg = (responseData as any).error.message;
        this.logger.log('ERROR', `Anthropic API error: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Extract response content
      const aiResponse = responseData.content[0].text;
      const inputTokens = responseData.usage.input_tokens;
      const outputTokens = responseData.usage.output_tokens;
      const totalTokens = inputTokens + outputTokens;
      const modelUsed = responseData.model;
      
      // Add AI response to history
      this.historyManager.addAIResponse('anthropic', aiResponse);
      
      // Create metadata
      const metadata: TurnMetadata = {
        turn: turnNumber,
        speaker: 'anthropic',
        model: modelUsed,
        timestamp: new Date().toISOString(),
        input: message,
        output: aiResponse,
        response_time_ms: responseTime,
        tokens: {
          total: totalTokens,
          input: inputTokens,
          output: outputTokens
        },
        raw_response: responseData
      };
      
      // Save metadata
      const logDir = path.join(process.cwd(), 'logs');
      const metadataFile = path.join(logDir, `${sessionId}_turn_${turnNumber}_anthropic.json`);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
      
      // Log success
      this.logger.log('OUTPUT', aiResponse);
      this.logger.log('METADATA', `Tokens: ${totalTokens}, Response time: ${responseTime}ms`);
      this.logger.log('INFO', 'Successfully processed Anthropic response');
      
      return {
        response: aiResponse,
        metadata
      };
      
    } catch (error) {
      this.logger.log('ERROR', `Failed to process Anthropic request: ${error}`);
      throw error;
    }
  }
}
