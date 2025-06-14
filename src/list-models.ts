#!/usr/bin/env node

/**
 * Utility script to list available models from provider APIs
 * Usage:
 *   npx tsx src/list-models.ts
 *   npx tsx src/list-models.ts --provider openai
 *   npx tsx src/list-models.ts --provider anthropic
 *   npx tsx src/list-models.ts --dynamic
 */

import { loadConfig } from './config';
import { getSupportedModels, getModelListForError } from './model-registry';
import { getDynamicSupportedModels, getDynamicModelListForError, getModelCacheStatus } from './dynamic-model-registry';
import { LLMProvider } from './types';

async function listModels() {
  const args = process.argv.slice(2);
  const isDynamic = args.includes('--dynamic');
  const providerArg = args.find(arg => arg.startsWith('--provider='))?.split('=')[1] as LLMProvider;
  const specificProvider = providerArg || (args.includes('--provider') ? args[args.indexOf('--provider') + 1] as LLMProvider : null);

  console.log('🔍 LLM Models List\n');

  try {
    const config = loadConfig();
    const providers: LLMProvider[] = specificProvider ? [specificProvider] : ['openai', 'anthropic'];

    for (const provider of providers) {
      console.log(`\n## ${provider.toUpperCase()} Models`);
      console.log('='.repeat(30));

      if (isDynamic) {
        try {
          const apiKey = provider === 'openai' ? config.OPENAI_API_KEY : config.ANTHROPIC_API_KEY;
          const baseUrl = provider === 'openai' ? config.OPENAI_BASE_URL : config.ANTHROPIC_BASE_URL;

          console.log(`📡 Fetching models from ${provider} API...`);
          const models = await getDynamicSupportedModels(provider, apiKey, baseUrl);
          
          console.log(`✅ Found ${models.length} models:`);
          models.forEach((model, index) => {
            console.log(`  ${index + 1}. ${model}`);
          });

          // Show cache status
          const cacheStatus = getModelCacheStatus();
          if (cacheStatus[provider].cached) {
            const ageMinutes = Math.floor((cacheStatus[provider].age || 0) / (1000 * 60));
            console.log(`💾 Cached (${ageMinutes} minutes old)`);
          }

        } catch (error) {
          console.error(`❌ Failed to fetch ${provider} models:`, error);
          console.log('📋 Falling back to static list...');
          
          const staticModels = getSupportedModels(provider);
          console.log(`📚 Static models (${staticModels.length}):`);
          staticModels.forEach((model, index) => {
            console.log(`  ${index + 1}. ${model}`);
          });
        }
      } else {
        const staticModels = getSupportedModels(provider);
        console.log(`📚 Static models (${staticModels.length}):`);
        staticModels.forEach((model, index) => {
          console.log(`  ${index + 1}. ${model}`);
        });
      }
    }

    // Show usage examples
    console.log('\n## Configuration Examples');
    console.log('='.repeat(30));
    
    if (isDynamic) {
      console.log('Dynamic model validation (fetches from API):');
      console.log('```typescript');
      console.log('import { loadEnhancedConfig } from "./enhanced-config";');
      console.log('const config = await loadEnhancedConfig({ useDynamicModels: true });');
      console.log('```\n');
    }

    console.log('Example config.env entries:');
    console.log('```bash');
    console.log('# Use different models from same provider');
    console.log('LLM1_PROVIDER="anthropic"');
    console.log('LLM1_MODEL="claude-3-5-sonnet-20241022"');
    console.log('LLM2_PROVIDER="anthropic"');
    console.log('LLM2_MODEL="claude-3-5-haiku-20241022"');
    console.log('```');

    console.log('\n## Usage Tips');
    console.log('='.repeat(30));
    console.log('• Use --dynamic to fetch latest models from APIs');
    console.log('• Use --provider to list specific provider models');
    console.log('• Models are cached for 24 hours to reduce API calls');
    console.log('• If API fails, system falls back to static model list');
    console.log('• Newer models may be available via dynamic fetching');

  } catch (error) {
    console.error('❌ Error loading configuration:', error);
    console.log('\n📝 Make sure config.env exists with valid API keys');
    process.exit(1);
  }
}

if (require.main === module) {
  listModels().catch(console.error);
}