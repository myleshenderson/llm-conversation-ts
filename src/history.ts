import * as fs from 'fs';
import * as path from 'path';
import { ConversationHistory, ConversationMessage, OpenAIMessage, AnthropicMessage } from './types';

export class HistoryManager {
  private historyFile: string;
  private history: ConversationHistory;
  
  constructor(historyFile: string, topic: string) {
    this.historyFile = historyFile;
    this.history = this.loadOrCreateHistory(topic);
  }
  
  private loadOrCreateHistory(topic: string): ConversationHistory {
    if (fs.existsSync(this.historyFile)) {
      const historyContent = fs.readFileSync(this.historyFile, 'utf-8');
      return JSON.parse(historyContent);
    } else {
      return {
        conversation_topic: topic,
        messages: []
      };
    }
  }
  
  save(): void {
    // Ensure directory exists
    const historyDir = path.dirname(this.historyFile);
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }
    
    fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
  }
  
  addMessage(message: ConversationMessage): void {
    this.history.messages.push(message);
    this.save();
  }
  
  buildOpenAIMessages(newMessage: string, topic: string): OpenAIMessage[] {
    // Add new user message
    this.addMessage({ role: 'user', content: newMessage });
    
    // Build OpenAI format messages
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: `You are participating in a conversation with another AI about: ${topic}. This is an ongoing discussion - respond naturally and build upon what has been said before. Keep your responses concise but meaningful.`
      }
    ];
    
    // Convert history to OpenAI format
    for (const msg of this.history.messages) {
      if (msg.speaker === 'anthropic') {
        messages.push({ role: 'assistant', content: msg.content });
      } else if (msg.role) {
        messages.push({ 
          role: msg.role as 'system' | 'user' | 'assistant', 
          content: msg.content 
        });
      } else {
        messages.push({ role: 'user', content: msg.content });
      }
    }
    
    return messages;
  }
  
  buildAnthropicMessages(newMessage: string): AnthropicMessage[] {
    // Add new user message
    this.addMessage({ role: 'user', content: newMessage });
    
    // Build Anthropic format messages (user/assistant alternating)
    const messages: AnthropicMessage[] = [];
    const totalMessages = this.history.messages.length;
    let cacheBlocksUsed = 0;
    const maxCacheBlocks = 4; // Anthropic limit
    
    // Convert history to Anthropic format with limited cache control
    for (let i = 0; i < this.history.messages.length; i++) {
      const msg = this.history.messages[i];
      const isLastFewMessages = i >= totalMessages - 2; // Don't cache last 2 messages
      const canAddCache = cacheBlocksUsed < maxCacheBlocks && !isLastFewMessages;
      
      let content: string | Array<any>;
      
      if (canAddCache && totalMessages > 6) { // Only use caching for longer conversations
        // Add cache control to strategic older messages
        content = [{
          type: 'text',
          text: msg.content,
          cache_control: {
            type: 'ephemeral'
          }
        }];
        cacheBlocksUsed++;
      } else {
        // Keep as simple strings (no caching)
        content = msg.content;
      }
      
      if (msg.speaker === 'openai') {
        messages.push({ role: 'assistant', content });
      } else if (msg.role && msg.role !== 'system') {
        messages.push({ 
          role: msg.role as 'user' | 'assistant', 
          content 
        });
      } else {
        messages.push({ role: 'user', content });
      }
    }
    
    return messages;
  }
  
  addAIResponse(speaker: 'openai' | 'anthropic', content: string): void {
    this.addMessage({ speaker, content });
  }
  
  getHistory(): ConversationHistory {
    return this.history;
  }
}
