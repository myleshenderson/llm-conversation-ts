import { Config, LLMProvider, LLMIdentifier } from './types';
import { LLMHandler } from './llm-handler-interface';
import { OpenAIHandler } from './openai-handler';
import { AnthropicHandler } from './anthropic-handler';
import { ConversationAdapter } from './conversation-adapter';

export class LLMHandlerFactory {
  static createHandler(
    provider: LLMProvider,
    config: Config,
    sessionId: string,
    turnNumber: number
  ): LLMHandler {
    switch (provider) {
      case 'openai':
        return new OpenAIHandler(config, sessionId, turnNumber);
      case 'anthropic':
        return new AnthropicHandler(config, sessionId, turnNumber);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
  
  static getProviderForLLM(llmId: LLMIdentifier, config: Config): LLMProvider {
    return ConversationAdapter.getProviderForLLM(llmId, config);
  }
}