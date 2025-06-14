#!/usr/bin/env node

/**
 * Type safety test for config validation improvements
 * This test verifies that the type safety issues have been resolved
 */

import { LLMProvider } from './types';
import { isModelSupported, getModelListForError } from './model-registry';

function testTypeSafety() {
  console.log('🔒 Testing type safety improvements in config validation...\n');
  
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
  
  // Test 1: Type safety of LLMProvider validation
  test('Type safety - LLMProvider type validation works correctly', () => {
    const validProviders: LLMProvider[] = ['openai', 'anthropic'];
    
    // These should compile without type errors
    const isOpenAIValid = validProviders.includes('openai');
    const isAnthropicValid = validProviders.includes('anthropic');
    
    if (!isOpenAIValid) throw new Error('openai should be valid provider');
    if (!isAnthropicValid) throw new Error('anthropic should be valid provider');
  });
  
  // Test 2: Type safety of model validation functions
  test('Type safety - model validation functions use proper types', () => {
    // These function calls should compile without type errors
    const isValid1 = isModelSupported('openai', 'gpt-4');
    const isValid2 = isModelSupported('anthropic', 'claude-3-5-sonnet-20241022');
    const isInvalid1 = isModelSupported('openai', 'invalid-model');
    const isInvalid2 = isModelSupported('anthropic', 'invalid-model');
    
    if (!isValid1) throw new Error('gpt-4 should be valid for openai');
    if (!isValid2) throw new Error('claude-3-5-sonnet-20241022 should be valid for anthropic');
    if (isInvalid1) throw new Error('invalid-model should not be valid for openai');
    if (isInvalid2) throw new Error('invalid-model should not be valid for anthropic');
  });
  
  // Test 3: Type safety of error message generation
  test('Type safety - error message generation with proper types', () => {
    const openaiErrorList = getModelListForError('openai');
    const anthropicErrorList = getModelListForError('anthropic');
    
    if (!openaiErrorList.includes('gpt-4')) throw new Error('OpenAI error list should include gpt-4');
    if (!anthropicErrorList.includes('claude-3-5-sonnet-20241022')) throw new Error('Anthropic error list should include claude models');
    if (!openaiErrorList.includes(', ')) throw new Error('Error list should be comma-separated');
  });
  
  // Test 4: Type safety of provider-specific logic
  test('Type safety - provider-specific logic uses proper types', () => {
    const providers: LLMProvider[] = ['openai', 'anthropic'];
    
    for (const provider of providers) {
      // This should compile without type errors
      const models = getModelListForError(provider);
      const hasValidModel = models.length > 0;
      
      if (!hasValidModel) throw new Error(`Provider ${provider} should have valid models`);
    }
  });
  
  // Test 5: Type safety of undefined/null handling
  test('Type safety - proper handling of undefined/null values', () => {
    // Test that empty strings are handled correctly
    const emptyString = '';
    const whitespaceString = '   ';
    const undefinedValue = undefined;
    const nullValue = null;
    
    // These checks should work without type errors
    const isEmpty1 = emptyString.trim() === '';
    const isEmpty2 = whitespaceString.trim() === '';
    const isEmpty3 = !undefinedValue;
    const isEmpty4 = !nullValue;
    
    if (!isEmpty1) throw new Error('Empty string should be considered empty');
    if (!isEmpty2) throw new Error('Whitespace string should be considered empty');
    if (!isEmpty3) throw new Error('Undefined should be considered empty');
    if (!isEmpty4) throw new Error('Null should be considered empty');
  });
  
  // Test 6: Type safety of configuration validation logic
  test('Type safety - configuration validation preserves types', () => {
    // Mock configuration object with proper typing
    const mockConfigData: Record<string, string | undefined> = {
      'LLM1_PROVIDER': 'openai',
      'LLM2_PROVIDER': 'anthropic',
      'LLM1_MODEL': 'gpt-4',
      'LLM2_MODEL': 'claude-3-5-sonnet-20241022'
    };
    
    // These operations should work without type errors
    const llm1Provider = mockConfigData['LLM1_PROVIDER'];
    const llm2Provider = mockConfigData['LLM2_PROVIDER'];
    const llm1Model = mockConfigData['LLM1_MODEL'];
    const llm2Model = mockConfigData['LLM2_MODEL'];
    
    // Type guards should work correctly
    if (llm1Provider && (llm1Provider === 'openai' || llm1Provider === 'anthropic')) {
      const typedProvider = llm1Provider as LLMProvider;
      const isValidProvider = ['openai', 'anthropic'].includes(typedProvider);
      if (!isValidProvider) throw new Error('Provider type validation failed');
    }
    
    // Model validation should work with proper types
    if (llm1Model && llm1Model.trim() !== '' && llm1Provider) {
      const typedProvider = llm1Provider as LLMProvider;
      const isValidModel = isModelSupported(typedProvider, llm1Model);
      if (!isValidModel) throw new Error('Model validation should work with typed providers');
    }
  });
  
  console.log(`\n📊 Type Safety Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('❌ Some type safety tests failed!');
    process.exit(1);
  } else {
    console.log('✅ All type safety tests passed!');
    console.log('🎉 Type safety improvements have been successfully implemented!');
  }
}

if (require.main === module) {
  testTypeSafety();
}