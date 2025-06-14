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
    turnNumber: number,
    model?: string
  ): LLMHandler {
    switch (provider) {
      case 'openai':
        return new OpenAIHandler(config, sessionId, turnNumber, model);
      case 'anthropic':
        return new AnthropicHandler(config, sessionId, turnNumber, model);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
  
  static createHandlerForLLM(
    llmId: LLMIdentifier,
    config: Config,
    sessionId: string,
    turnNumber: number
  ): LLMHandler {
    const provider = this.getProviderForLLM(llmId, config);
    const model = ConversationAdapter.getModelForLLM(llmId, config);
    return this.createHandler(provider, config, sessionId, turnNumber, model);
  }
  
  static getProviderForLLM(llmId: LLMIdentifier, config: Config): LLMProvider {
    return ConversationAdapter.getProviderForLLM(llmId, config);
  }
}