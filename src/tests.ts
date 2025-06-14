#!/usr/bin/env node

/**
 * Basic tests for configurable LLM providers functionality
 * Run with: npx tsx src/tests.ts
 */

import { LLMHandlerFactory } from './llm-handler-factory';
import { ConversationAdapter } from './conversation-adapter';
import { Config, LLMProvider, LLMIdentifier } from './types';

// Mock configuration for testing
const mockConfig: Config = {
  LLM1_PROVIDER: 'openai' as LLMProvider,
  LLM2_PROVIDER: 'anthropic' as LLMProvider,
  OPENAI_API_KEY: 'test-key',
  OPENAI_MODEL: 'gpt-4',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  ANTHROPIC_API_KEY: 'test-key',
  ANTHROPIC_MODEL: 'claude-3-5-sonnet',
  ANTHROPIC_BASE_URL: 'https://api.anthropic.com/v1',
  CONVERSATION_TOPIC: 'Test topic',
  MAX_TURNS: '4',
  DELAY_BETWEEN_MESSAGES: '1'
};

function runTests() {
  console.log('🧪 Running basic tests for configurable LLM providers...\n');
  
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
  
  // Test ConversationAdapter.getProviderForLLM
  test('ConversationAdapter.getProviderForLLM - llm1 returns openai', () => {
    const result = ConversationAdapter.getProviderForLLM('llm1', mockConfig);
    if (result !== 'openai') throw new Error(`Expected 'openai', got '${result}'`);
  });
  
  test('ConversationAdapter.getProviderForLLM - llm2 returns anthropic', () => {
    const result = ConversationAdapter.getProviderForLLM('llm2', mockConfig);
    if (result !== 'anthropic') throw new Error(`Expected 'anthropic', got '${result}'`);
  });
  
  // Test LLMHandlerFactory delegation
  test('LLMHandlerFactory.getProviderForLLM delegates to ConversationAdapter', () => {
    const result1 = LLMHandlerFactory.getProviderForLLM('llm1', mockConfig);
    const result2 = ConversationAdapter.getProviderForLLM('llm1', mockConfig);
    if (result1 !== result2) throw new Error('Factory does not delegate properly');
  });
  
  // Test ConversationAdapter.transformSpeakerForOutput
  test('ConversationAdapter.transformSpeakerForOutput - llm1 transforms to openai', () => {
    const result = ConversationAdapter.transformSpeakerForOutput('llm1', mockConfig);
    if (result !== 'openai') throw new Error(`Expected 'openai', got '${result}'`);
  });
  
  test('ConversationAdapter.transformSpeakerForOutput - valid provider passthrough', () => {
    const result = ConversationAdapter.transformSpeakerForOutput('anthropic', mockConfig);
    if (result !== 'anthropic') throw new Error(`Expected 'anthropic', got '${result}'`);
  });
  
  test('ConversationAdapter.transformSpeakerForOutput - invalid speaker throws error', () => {
    try {
      ConversationAdapter.transformSpeakerForOutput('invalid', mockConfig);
      throw new Error('Should have thrown an error');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Invalid speaker')) {
        throw new Error('Wrong error message');
      }
    }
  });
  
  // Test ConversationAdapter.getModelForLLM
  test('ConversationAdapter.getModelForLLM - llm1 returns OpenAI model', () => {
    const result = ConversationAdapter.getModelForLLM('llm1', mockConfig);
    if (result !== 'gpt-4') throw new Error(`Expected 'gpt-4', got '${result}'`);
  });
  
  test('ConversationAdapter.getModelForLLM - llm2 returns Anthropic model', () => {
    const result = ConversationAdapter.getModelForLLM('llm2', mockConfig);
    if (result !== 'claude-3-5-sonnet') throw new Error(`Expected 'claude-3-5-sonnet', got '${result}'`);
  });
  
  // Test ConversationAdapter.getApiBaseForLLM
  test('ConversationAdapter.getApiBaseForLLM - llm1 returns OpenAI base URL', () => {
    const result = ConversationAdapter.getApiBaseForLLM('llm1', mockConfig);
    if (result !== 'https://api.openai.com/v1') throw new Error(`Expected OpenAI URL, got '${result}'`);
  });
  
  // Test LLMHandlerFactory.createHandler
  test('LLMHandlerFactory.createHandler - creates OpenAI handler', () => {
    const handler = LLMHandlerFactory.createHandler('openai', mockConfig, 'test-session', 1, 'speaker_1');
    if (!handler) throw new Error('Handler not created');
    if (handler.constructor.name !== 'OpenAIHandler') throw new Error('Wrong handler type');
  });
  
  test('LLMHandlerFactory.createHandler - creates Anthropic handler', () => {
    const handler = LLMHandlerFactory.createHandler('anthropic', mockConfig, 'test-session', 1, 'speaker_2');
    if (!handler) throw new Error('Handler not created');
    if (handler.constructor.name !== 'AnthropicHandler') throw new Error('Wrong handler type');
  });
  
  test('LLMHandlerFactory.createHandler - throws error for invalid provider', () => {
    try {
      LLMHandlerFactory.createHandler('invalid' as LLMProvider, mockConfig, 'test-session', 1, 'speaker_1');
      throw new Error('Should have thrown an error');
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('Unsupported LLM provider')) {
        throw new Error('Wrong error message');
      }
    }
  });
  
  // Test speaker position mapping
  test('LLMHandlerFactory.getSpeakerPositionForLLM - llm1 maps to speaker_1', () => {
    const result = LLMHandlerFactory.getSpeakerPositionForLLM('llm1');
    if (result !== 'speaker_1') throw new Error(`Expected 'speaker_1', got '${result}'`);
  });
  
  test('LLMHandlerFactory.getSpeakerPositionForLLM - llm2 maps to speaker_2', () => {
    const result = LLMHandlerFactory.getSpeakerPositionForLLM('llm2');
    if (result !== 'speaker_2') throw new Error(`Expected 'speaker_2', got '${result}'`);
  });
  
  // Test provider configuration validation
  test('ConversationAdapter handles mixed provider configuration', () => {
    const mixedConfig: Config = {
      ...mockConfig,
      LLM1_PROVIDER: 'anthropic' as LLMProvider,
      LLM2_PROVIDER: 'openai' as LLMProvider
    };
    
    const llm1Provider = ConversationAdapter.getProviderForLLM('llm1', mixedConfig);
    const llm2Provider = ConversationAdapter.getProviderForLLM('llm2', mixedConfig);
    
    if (llm1Provider !== 'anthropic') throw new Error('LLM1 should be anthropic');
    if (llm2Provider !== 'openai') throw new Error('LLM2 should be openai');
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