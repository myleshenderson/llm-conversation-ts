import { Config, LLMIdentifier, LLMProvider } from './types';

/**
 * ConversationAdapter is responsible for mapping between internal LLM identifiers
 * (llm1, llm2) and the actual provider names (openai, anthropic) to maintain
 * compatibility with the visualizer project.
 */
export class ConversationAdapter {
  /**
   * Maps an internal LLM identifier to its configured provider
   */
  static getProviderForLLM(llmId: LLMIdentifier, config: Config): LLMProvider {
    const provider = llmId === 'llm1' ? config.LLM1_PROVIDER : config.LLM2_PROVIDER;
    
    if (!provider) {
      throw new Error(`Provider not configured for ${llmId}`);
    }
    
    return provider;
  }
  
  /**
   * Transforms internal LLM identifiers to provider names for external output
   * This is used when saving conversation data to ensure visualizer compatibility
   */
  static transformSpeakerForOutput(speaker: string, config: Config): LLMProvider {
    if (speaker === 'llm1') {
      return this.getProviderForLLM('llm1', config);
    } else if (speaker === 'llm2') {
      return this.getProviderForLLM('llm2', config);
    }
    
    // Validate that it's a valid provider name
    const validProviders: LLMProvider[] = ['openai', 'anthropic'];
    if (validProviders.includes(speaker as LLMProvider)) {
      return speaker as LLMProvider;
    }
    
    throw new Error(`Invalid speaker: ${speaker}. Expected 'llm1', 'llm2', or a valid provider name.`);
  }
  
  /**
   * Gets the model configuration for a specific LLM identifier
   * Uses LLM-specific model if configured, otherwise falls back to provider default
   */
  static getModelForLLM(llmId: LLMIdentifier, config: Config): string {
    // Check for LLM-specific model configuration first
    const specificModel = llmId === 'llm1' ? config.LLM1_MODEL : config.LLM2_MODEL;
    
    if (specificModel) {
      return specificModel;
    }
    
    // Fall back to provider default
    const provider = this.getProviderForLLM(llmId, config);
    
    switch (provider) {
      case 'openai':
        return config.OPENAI_MODEL;
      case 'anthropic':
        return config.ANTHROPIC_MODEL;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
  
  /**
   * Gets the API base URL for a specific LLM identifier
   */
  static getApiBaseForLLM(llmId: LLMIdentifier, config: Config): string {
    const provider = this.getProviderForLLM(llmId, config);
    
    switch (provider) {
      case 'openai':
        return config.OPENAI_BASE_URL;
      case 'anthropic':
        return config.ANTHROPIC_BASE_URL;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}