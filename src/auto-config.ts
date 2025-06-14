#!/usr/bin/env node

/**
 * Auto-configuration loader that uses dynamic model discovery by default
 * This addresses the "Model Registry Maintenance" concern by making dynamic discovery the default
 */

import { loadConfig } from './config';
import { loadEnhancedConfig } from './enhanced-config';
import { Config } from './types';

/**
 * Intelligent configuration loader that automatically uses dynamic model discovery
 * when API credentials are available, falling back to static registry when needed
 */
export async function loadAutoConfig(): Promise<Config> {
  try {
    // First load basic config to check for API credentials
    const basicConfig = loadConfig();
    
    // Check if we have API credentials for dynamic discovery
    const hasOpenAIKey = basicConfig.OPENAI_API_KEY && 
                        basicConfig.OPENAI_API_KEY !== 'sk-your-actual-openai-key-here' &&
                        basicConfig.OPENAI_API_KEY.length > 20;
                        
    const hasAnthropicKey = basicConfig.ANTHROPIC_API_KEY && 
                           basicConfig.ANTHROPIC_API_KEY !== 'sk-ant-your-actual-anthropic-key-here' &&
                           basicConfig.ANTHROPIC_API_KEY.length > 20;
    
    // Use dynamic discovery if we have valid API credentials
    if (hasOpenAIKey || hasAnthropicKey) {
      console.log('🔍 Auto-config: Using dynamic model discovery (API credentials detected)');
      return await loadEnhancedConfig({
        useDynamicModels: true,
        validateModelsOnStartup: true
      });
    } else {
      console.log('📚 Auto-config: Using static model registry (no API credentials)');
      return basicConfig;
    }
  } catch (error) {
    console.warn('⚠️  Dynamic model discovery failed, falling back to static registry:', error);
    return loadConfig();
  }
}

/**
 * Force dynamic model discovery (throws if APIs unavailable)
 */
export async function loadDynamicConfig(): Promise<Config> {
  return await loadEnhancedConfig({
    useDynamicModels: true,
    validateModelsOnStartup: true
  });
}

/**
 * Force static model registry (never calls APIs)
 */
export function loadStaticConfig(): Config {
  return loadConfig();
}

if (require.main === module) {
  // CLI usage: npx tsx src/auto-config.ts
  loadAutoConfig()
    .then(config => {
      console.log('\n✅ Configuration loaded successfully');
      console.log(`   LLM1: ${config.LLM1_PROVIDER}${config.LLM1_MODEL ? `:${config.LLM1_MODEL}` : ''}`);
      console.log(`   LLM2: ${config.LLM2_PROVIDER}${config.LLM2_MODEL ? `:${config.LLM2_MODEL}` : ''}`);
    })
    .catch(error => {
      console.error('❌ Configuration failed:', error);
      process.exit(1);
    });
}