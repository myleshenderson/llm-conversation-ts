import * as fs from 'fs';
import * as path from 'path';
import { Config, OpenAIResponse, TurnMetadata, AIHandlerResult } from './types';
import { Logger } from './logger';
import { HistoryManager } from './history';
import { withRetry, DEFAULT_RETRY_OPTIONS } from './retry-utils';

export class OpenAIHandler {
  private config: Config;
  private logger: Logger;
  private historyManager: HistoryManager;
  
  constructor(config: Config, sessionId: string, turnNumber: number) {
    this.config = config;
    
    const logDir = path.join(process.cwd(), 'logs');
    const openaiLog = path.join(logDir, `${sessionId}_openai.log`);
    const historyFile = path.join(logDir, `${sessionId}_history.json`);
    
    this.logger = new Logger(openaiLog, turnNumber);
    this.historyManager = new HistoryManager(historyFile, config.CONVERSATION_TOPIC);
  }
  
  async processMessage(message: string, sessionId: string, turnNumber: number): Promise<AIHandlerResult> {
    this.logger.setTurnNumber(turnNumber);
    this.logger.log('INFO', 'Received message from conversation orchestrator');
    this.logger.log('INPUT', message);
    
    try {
      // Build messages with history
      const messages = this.historyManager.buildOpenAIMessages(message, this.config.CONVERSATION_TOPIC);
      
      // Prepare API request
      const payload = {
        model: this.config.OPENAI_MODEL,
        messages,
        max_tokens: 1000,
        temperature: 0.7
      };
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.OPENAI_API_KEY}`
      };
      
      this.logger.log('DEBUG', `Sending request to OpenAI API with ${messages.length} messages in history`);
      this.logger.log('DEBUG', `Model: ${this.config.OPENAI_MODEL}`);
      
      // Make API call with retry logic
      const startTime = Date.now();
      
      const responseData = await withRetry(async () => {
        this.logger.log('DEBUG', 'Making API request to OpenAI...');
        
        const response = await fetch(`${this.config.OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          this.logger.log('ERROR', `HTTP ${response.status}: ${errorText}`);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json() as OpenAIResponse;
      }, {
        ...DEFAULT_RETRY_OPTIONS,
        retries: 5 // Retry up to 5 times for rate limits
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      this.logger.log('DEBUG', `Response time: ${responseTime}ms (including retries)`);
      this.logger.log('INFO', 'Successfully received response from OpenAI');
      
      // Check for API errors
      if ('error' in responseData) {
        const errorMsg = (responseData as any).error.message;
        this.logger.log('ERROR', `OpenAI API error: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      // Extract response content
      const aiResponse = responseData.choices[0].message.content;
      const tokensUsed = responseData.usage.total_tokens;
      const promptTokens = responseData.usage.prompt_tokens;
      const completionTokens = responseData.usage.completion_tokens;
      const modelUsed = responseData.model;
      
      // Add AI response to history
      this.historyManager.addAIResponse('openai', aiResponse);
      
      // Create metadata
      const metadata: TurnMetadata = {
        turn: turnNumber,
        speaker: 'openai',
        model: modelUsed,
        timestamp: new Date().toISOString(),
        input: message,
        output: aiResponse,
        response_time_ms: responseTime,
        tokens: {
          total: tokensUsed,
          prompt: promptTokens,
          completion: completionTokens
        },
        raw_response: responseData
      };
      
      // Save metadata
      const logDir = path.join(process.cwd(), 'logs');
      const metadataFile = path.join(logDir, `${sessionId}_turn_${turnNumber}_openai.json`);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
      
      // Log success
      this.logger.log('OUTPUT', aiResponse);
      this.logger.log('METADATA', `Tokens: ${tokensUsed}, Response time: ${responseTime}ms`);
      this.logger.log('INFO', 'Successfully processed OpenAI response');
      
      return {
        response: aiResponse,
        metadata
      };
      
    } catch (error) {
      this.logger.log('ERROR', `Failed to process OpenAI request: ${error}`);
      throw error;
    }
  }
}
