import { AIHandlerResult } from './types';

export interface LLMHandler {
  processMessage(message: string, sessionId: string, turnNumber: number): Promise<AIHandlerResult>;
}