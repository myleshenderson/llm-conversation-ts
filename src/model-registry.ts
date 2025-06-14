import { LLMProvider } from './types';

/**
 * Registry of supported models for each LLM provider
 */
export const SUPPORTED_MODELS: Record<LLMProvider, readonly string[]> = {
  openai: [
    // GPT-4 variants
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4-turbo-preview',
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-0125-preview',
    'gpt-4-1106-preview',
    'gpt-4-vision-preview',
    
    // GPT-3.5 variants
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k',
    'gpt-3.5-turbo-0125',
    'gpt-3.5-turbo-1106',
  ] as const,
  
  anthropic: [
    // Claude 3.5 models
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    
    // Claude 3 models
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
    
    // Claude 2 models (legacy)
    'claude-2.1',
    'claude-2.0',
    'claude-instant-1.2',
  ] as const,
};

/**
 * Validate if a model is supported by a provider
 */
export function isModelSupported(provider: LLMProvider, model: string): boolean {
  return SUPPORTED_MODELS[provider].includes(model);
}

/**
 * Get the list of supported models for a provider
 */
export function getSupportedModels(provider: LLMProvider): readonly string[] {
  return SUPPORTED_MODELS[provider];
}

/**
 * Get a formatted list of supported models for error messages
 */
export function getModelListForError(provider: LLMProvider): string {
  return SUPPORTED_MODELS[provider].join(', ');
}