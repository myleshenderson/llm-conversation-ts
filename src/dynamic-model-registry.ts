import { LLMProvider } from './types';

/**
 * Dynamic model registry that fetches available models from provider APIs
 */

interface ModelInfo {
  id: string;
  display_name: string;
  created_at: string;
  type: 'model';
}

interface ModelsListResponse {
  data: ModelInfo[];
  has_more: boolean;
  first_id: string | null;
  last_id: string | null;
}

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface OpenAIModelsResponse {
  object: string;
  data: OpenAIModel[];
}

// Cache for model lists to avoid excessive API calls
const modelCache = new Map<LLMProvider, {
  models: string[];
  timestamp: number;
  ttl: number;
}>();

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch available models from Anthropic API
 */
async function fetchAnthropicModels(apiKey: string, baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as ModelsListResponse;
    return data.data.map(model => model.id);
  } catch (error) {
    console.warn('Failed to fetch Anthropic models from API, falling back to static list:', error);
    // Fallback to static list if API fails
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ];
  }
}

/**
 * Fetch available models from OpenAI API
 */
async function fetchOpenAIModels(apiKey: string, baseUrl: string): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OpenAIModelsResponse;
    
    // Filter for chat completion models only
    return data.data
      .filter(model => 
        model.id.includes('gpt-') && 
        !model.id.includes('instruct') && 
        !model.id.includes('davinci') &&
        !model.id.includes('curie') &&
        !model.id.includes('babbage') &&
        !model.id.includes('ada')
      )
      .map(model => model.id);
  } catch (error) {
    console.warn('Failed to fetch OpenAI models from API, falling back to static list:', error);
    // Fallback to static list if API fails
    return [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-0125-preview',
      'gpt-4-1106-preview',
      'gpt-4-vision-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-0125',
      'gpt-3.5-turbo-1106'
    ];
  }
}

/**
 * Get supported models for a provider (with caching and API fallback)
 */
export async function getDynamicSupportedModels(
  provider: LLMProvider,
  apiKey?: string,
  baseUrl?: string
): Promise<string[]> {
  // Check cache first
  const cached = modelCache.get(provider);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.models;
  }

  let models: string[];

  if (apiKey && baseUrl) {
    // Try to fetch from API
    switch (provider) {
      case 'anthropic':
        models = await fetchAnthropicModels(apiKey, baseUrl);
        break;
      case 'openai':
        models = await fetchOpenAIModels(apiKey, baseUrl);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  } else {
    // Fallback to static list if no API credentials
    const { getSupportedModels } = await import('./model-registry');
    models = Array.from(getSupportedModels(provider));
  }

  // Cache the results
  modelCache.set(provider, {
    models,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  });

  return models;
}

/**
 * Validate if a model is supported by a provider (dynamic version)
 */
export async function isDynamicModelSupported(
  provider: LLMProvider,
  model: string,
  apiKey?: string,
  baseUrl?: string
): Promise<boolean> {
  const supportedModels = await getDynamicSupportedModels(provider, apiKey, baseUrl);
  return supportedModels.includes(model);
}

/**
 * Get a formatted list of supported models for error messages (dynamic version)
 */
export async function getDynamicModelListForError(
  provider: LLMProvider,
  apiKey?: string,
  baseUrl?: string
): Promise<string> {
  const supportedModels = await getDynamicSupportedModels(provider, apiKey, baseUrl);
  return supportedModels.join(', ');
}

/**
 * Clear the model cache (useful for testing or forcing refresh)
 */
export function clearModelCache(): void {
  modelCache.clear();
}

/**
 * Get cache status for debugging
 */
export function getModelCacheStatus(): Record<LLMProvider, { cached: boolean; age?: number }> {
  const status: Record<LLMProvider, { cached: boolean; age?: number }> = {
    openai: { cached: false },
    anthropic: { cached: false }
  };

  for (const [provider, cache] of modelCache.entries()) {
    status[provider] = {
      cached: true,
      age: Date.now() - cache.timestamp
    };
  }

  return status;
}