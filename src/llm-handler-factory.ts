import { Config, LLMProvider, LLMIdentifier } from './types';
import { LLMHandler } from './llm-handler-interface';
import { OpenAIHandler } from './openai-handler';
import { AnthropicHandler } from './anthropic-handler';

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
    const providerKey = llmId === 'llm1' ? 'LLM1_PROVIDER' : 'LLM2_PROVIDER';
    const provider = (config as any)[providerKey] as LLMProvider;
    
    if (!provider) {
      throw new Error(`Provider not configured for ${llmId}`);
    }
    
    return provider;
  }
}