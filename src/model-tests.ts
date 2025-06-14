#!/usr/bin/env node

/**
 * Tests for multi-model configuration functionality
 * Run with: npx tsx src/model-tests.ts
 */

import { ConversationAdapter } from './conversation-adapter';
import { Config, LLMProvider } from './types';
import { isModelSupported, getSupportedModels, getModelListForError } from './model-registry';

// Mock configuration for testing
const createMockConfig = (overrides?: Partial<Config>): Config => ({
  LLM1_PROVIDER: 'openai' as LLMProvider,
  LLM2_PROVIDER: 'anthropic' as LLMProvider,
  LLM1_MODEL: undefined,
  LLM2_MODEL: undefined,
  OPENAI_API_KEY: 'test-key',
  OPENAI_MODEL: 'gpt-4',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  ANTHROPIC_API_KEY: 'test-key',
  ANTHROPIC_MODEL: 'claude-3-5-sonnet-20241022',
  ANTHROPIC_BASE_URL: 'https://api.anthropic.com/v1',
  CONVERSATION_TOPIC: 'Test topic',
  MAX_TURNS: '4',
  DELAY_BETWEEN_MESSAGES: '1',
  ...overrides
});

function runTests() {
  console.log('🧪 Running tests for multi-model configuration...\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name: string, testFn: () => void) {
    try {
      testFn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error}`);
      failed++;
    }
  }
  
  // Model Registry Tests
  test('Model registry - OpenAI models supported', () => {
    const openaiModels = getSupportedModels('openai');
    if (!openaiModels.includes('gpt-4')) throw new Error('gpt-4 not in OpenAI models');
    if (!openaiModels.includes('gpt-3.5-turbo')) throw new Error('gpt-3.5-turbo not in OpenAI models');
  });
  
  test('Model registry - Anthropic models supported', () => {
    const anthropicModels = getSupportedModels('anthropic');
    if (!anthropicModels.includes('claude-3-5-sonnet-20241022')) throw new Error('Claude 3.5 Sonnet not in models');
    if (!anthropicModels.includes('claude-3-haiku-20240307')) throw new Error('Claude 3 Haiku not in models');
  });
  
  test('Model validation - valid OpenAI model', () => {
    if (!isModelSupported('openai', 'gpt-4')) throw new Error('gpt-4 should be supported');
  });
  
  test('Model validation - invalid OpenAI model', () => {
    if (isModelSupported('openai', 'invalid-model')) throw new Error('invalid-model should not be supported');
  });
  
  test('Model validation - valid Anthropic model', () => {
    if (!isModelSupported('anthropic', 'claude-3-5-sonnet-20241022')) throw new Error('Claude should be supported');
  });
  
  test('Model validation - invalid Anthropic model', () => {
    if (isModelSupported('anthropic', 'claude-99')) throw new Error('claude-99 should not be supported');
  });
  
  // ConversationAdapter Tests with Model Overrides
  test('ConversationAdapter.getModelForLLM - uses default when no override', () => {
    const config = createMockConfig();
    const model = ConversationAdapter.getModelForLLM('llm1', config);
    if (model !== 'gpt-4') throw new Error(`Expected 'gpt-4', got '${model}'`);
  });
  
  test('ConversationAdapter.getModelForLLM - uses LLM1_MODEL override', () => {
    const config = createMockConfig({ LLM1_MODEL: 'gpt-3.5-turbo' });
    const model = ConversationAdapter.getModelForLLM('llm1', config);
    if (model !== 'gpt-3.5-turbo') throw new Error(`Expected 'gpt-3.5-turbo', got '${model}'`);
  });
  
  test('ConversationAdapter.getModelForLLM - uses LLM2_MODEL override', () => {
    const config = createMockConfig({ LLM2_MODEL: 'claude-3-haiku-20240307' });
    const model = ConversationAdapter.getModelForLLM('llm2', config);
    if (model !== 'claude-3-haiku-20240307') throw new Error(`Expected 'claude-3-haiku-20240307', got '${model}'`);
  });
  
  test('ConversationAdapter.getModelForLLM - mixed providers with overrides', () => {
    const config = createMockConfig({
      LLM1_PROVIDER: 'anthropic' as LLMProvider,
      LLM2_PROVIDER: 'openai' as LLMProvider,
      LLM1_MODEL: 'claude-3-opus-20240229',
      LLM2_MODEL: 'gpt-4o-mini'
    });
    
    const llm1Model = ConversationAdapter.getModelForLLM('llm1', config);
    const llm2Model = ConversationAdapter.getModelForLLM('llm2', config);
    
    if (llm1Model !== 'claude-3-opus-20240229') throw new Error(`LLM1 model mismatch`);
    if (llm2Model !== 'gpt-4o-mini') throw new Error(`LLM2 model mismatch`);
  });
  
  test('ConversationAdapter.getModelForLLM - same provider different models', () => {
    const config = createMockConfig({
      LLM1_PROVIDER: 'openai' as LLMProvider,
      LLM2_PROVIDER: 'openai' as LLMProvider,
      LLM1_MODEL: 'gpt-4',
      LLM2_MODEL: 'gpt-3.5-turbo'
    });
    
    const llm1Model = ConversationAdapter.getModelForLLM('llm1', config);
    const llm2Model = ConversationAdapter.getModelForLLM('llm2', config);
    
    if (llm1Model !== 'gpt-4') throw new Error(`LLM1 should be gpt-4`);
    if (llm2Model !== 'gpt-3.5-turbo') throw new Error(`LLM2 should be gpt-3.5-turbo`);
  });
  
  // Error message formatting
  test('Model list formatting for errors', () => {
    const errorList = getModelListForError('openai');
    if (!errorList.includes('gpt-4')) throw new Error('Error list should include models');
    if (!errorList.includes(', ')) throw new Error('Error list should be comma-separated');
  });
  
  // Error Boundary Tests
  test('Error boundary - handles empty model string', () => {
    if (isModelSupported('openai', '')) throw new Error('Empty model should not be supported');
    if (isModelSupported('anthropic', '')) throw new Error('Empty model should not be supported');
  });
  
  test('Error boundary - handles null/undefined model gracefully', () => {
    const config = createMockConfig({
      LLM1_MODEL: null as any,
      LLM2_MODEL: undefined
    });
    
    // Should not throw errors and fall back to defaults
    const llm1Model = ConversationAdapter.getModelForLLM('llm1', config);
    const llm2Model = ConversationAdapter.getModelForLLM('llm2', config);
    
    if (llm1Model !== 'gpt-4') throw new Error('Should fall back to default for null model');
    if (llm2Model !== 'claude-3-5-sonnet-20241022') throw new Error('Should fall back to default for undefined model');
  });
  
  test('Error boundary - case sensitivity in model names', () => {
    // Model names should be case-sensitive
    if (isModelSupported('openai', 'GPT-4')) throw new Error('Uppercase model should not match');
    if (isModelSupported('anthropic', 'CLAUDE-3-5-SONNET-20241022')) throw new Error('Uppercase model should not match');
  });
  
  test('Error boundary - special characters in model names', () => {
    // Test with various invalid characters
    const invalidModels = ['gpt-4!', 'claude@3', 'model with spaces', 'model\nwith\nnewlines'];
    
    for (const invalidModel of invalidModels) {
      if (isModelSupported('openai', invalidModel)) {
        throw new Error(`Invalid model '${invalidModel}' should not be supported`);
      }
    }
  });
  
  test('Error boundary - provider type validation', () => {
    // Test with invalid provider types - should return undefined but not crash
    try {
      const result = getSupportedModels('invalid' as any);
      // TypeScript will prevent this at compile time, but at runtime it should not crash
      if (result === undefined) {
        // This is acceptable behavior for an invalid provider
      }
    } catch (error) {
      // It's also acceptable if it throws an error for invalid provider
      // Either behavior is fine as long as it doesn't crash the application
    }
  });
  
  // Summary
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
  }
}

if (require.main === module) {
  runTests();
}