#!/usr/bin/env node

/**
 * Integration tests for multi-model configuration functionality with actual handlers
 * Run with: npx tsx src/integration-tests.ts
 */

import { LLMHandlerFactory } from './llm-handler-factory';
import { ConversationAdapter } from './conversation-adapter';
import { Config, LLMProvider } from './types';

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

function runIntegrationTests() {
  console.log('🔧 Running integration tests for multi-model configuration...\n');
  
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
  
  // Handler Creation Tests
  test('LLMHandlerFactory.createHandlerForLLM - creates OpenAI handler with default model', () => {
    const config = createMockConfig();
    const handler = LLMHandlerFactory.createHandlerForLLM('llm1', config, 'test-session', 1);
    
    if (!handler) throw new Error('Handler should be created');
    // Verify it's an OpenAI handler by checking the constructor name
    if (handler.constructor.name !== 'OpenAIHandler') {
      throw new Error(`Expected OpenAIHandler, got ${handler.constructor.name}`);
    }
  });
  
  test('LLMHandlerFactory.createHandlerForLLM - creates Anthropic handler with default model', () => {
    const config = createMockConfig();
    const handler = LLMHandlerFactory.createHandlerForLLM('llm2', config, 'test-session', 1);
    
    if (!handler) throw new Error('Handler should be created');
    // Verify it's an Anthropic handler
    if (handler.constructor.name !== 'AnthropicHandler') {
      throw new Error(`Expected AnthropicHandler, got ${handler.constructor.name}`);
    }
  });
  
  test('LLMHandlerFactory.createHandlerForLLM - creates handler with specific model override', () => {
    const config = createMockConfig({ 
      LLM1_MODEL: 'gpt-3.5-turbo',
      LLM2_MODEL: 'claude-3-haiku-20240307'
    });
    
    const llm1Handler = LLMHandlerFactory.createHandlerForLLM('llm1', config, 'test-session', 1);
    const llm2Handler = LLMHandlerFactory.createHandlerForLLM('llm2', config, 'test-session', 1);
    
    if (!llm1Handler || !llm2Handler) throw new Error('Handlers should be created');
    
    // Verify the handlers were created successfully with the specific models
    if (llm1Handler.constructor.name !== 'OpenAIHandler') {
      throw new Error('LLM1 should be OpenAI handler');
    }
    if (llm2Handler.constructor.name !== 'AnthropicHandler') {
      throw new Error('LLM2 should be Anthropic handler');
    }
  });
  
  test('LLMHandlerFactory.createHandlerForLLM - same provider different models', () => {
    const config = createMockConfig({
      LLM1_PROVIDER: 'openai' as LLMProvider,
      LLM2_PROVIDER: 'openai' as LLMProvider,
      LLM1_MODEL: 'gpt-4',
      LLM2_MODEL: 'gpt-3.5-turbo'
    });
    
    const llm1Handler = LLMHandlerFactory.createHandlerForLLM('llm1', config, 'test-session', 1);
    const llm2Handler = LLMHandlerFactory.createHandlerForLLM('llm2', config, 'test-session', 2);
    
    if (!llm1Handler || !llm2Handler) throw new Error('Handlers should be created');
    
    // Both should be OpenAI handlers
    if (llm1Handler.constructor.name !== 'OpenAIHandler') {
      throw new Error('LLM1 should be OpenAI handler');
    }
    if (llm2Handler.constructor.name !== 'OpenAIHandler') {
      throw new Error('LLM2 should be OpenAI handler');
    }
  });
  
  // Error Boundary Tests
  test('Error handling - invalid provider throws error', () => {
    const config = createMockConfig({
      LLM1_PROVIDER: 'invalid' as any
    });
    
    try {
      LLMHandlerFactory.createHandlerForLLM('llm1', config, 'test-session', 1);
      throw new Error('Should have thrown error for invalid provider');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('Unknown provider') && !errorMessage.includes('Unsupported LLM provider')) {
        throw new Error(`Expected provider error, got: ${errorMessage}`);
      }
    }
  });
  
  test('Provider resolution - correctly maps LLM identifiers to providers', () => {
    const config = createMockConfig({
      LLM1_PROVIDER: 'anthropic' as LLMProvider,
      LLM2_PROVIDER: 'openai' as LLMProvider
    });
    
    const llm1Provider = LLMHandlerFactory.getProviderForLLM('llm1', config);
    const llm2Provider = LLMHandlerFactory.getProviderForLLM('llm2', config);
    
    if (llm1Provider !== 'anthropic') throw new Error('LLM1 should map to anthropic');
    if (llm2Provider !== 'openai') throw new Error('LLM2 should map to openai');
  });
  
  test('Model resolution - correctly resolves models with fallback', () => {
    const config = createMockConfig({
      LLM1_MODEL: 'gpt-4o-mini',
      // LLM2_MODEL not specified, should fall back to provider default
    });
    
    const llm1Model = ConversationAdapter.getModelForLLM('llm1', config);
    const llm2Model = ConversationAdapter.getModelForLLM('llm2', config);
    
    if (llm1Model !== 'gpt-4o-mini') throw new Error(`LLM1 should use override model, got ${llm1Model}`);
    if (llm2Model !== 'claude-3-5-sonnet-20241022') throw new Error(`LLM2 should use default, got ${llm2Model}`);
  });
  
  // Configuration Edge Cases
  test('Edge case - undefined model configuration handled gracefully', () => {
    const config = createMockConfig({
      LLM1_MODEL: undefined,
      LLM2_MODEL: undefined
    });
    
    const llm1Model = ConversationAdapter.getModelForLLM('llm1', config);
    const llm2Model = ConversationAdapter.getModelForLLM('llm2', config);
    
    // Should fall back to provider defaults
    if (llm1Model !== 'gpt-4') throw new Error('LLM1 should use provider default');
    if (llm2Model !== 'claude-3-5-sonnet-20241022') throw new Error('LLM2 should use provider default');
  });
  
  test('Cross-provider validation - mixed configurations work correctly', () => {
    const config = createMockConfig({
      LLM1_PROVIDER: 'anthropic' as LLMProvider,
      LLM1_MODEL: 'claude-3-opus-20240229',
      LLM2_PROVIDER: 'openai' as LLMProvider,
      LLM2_MODEL: 'gpt-4o-mini'
    });
    
    const llm1Handler = LLMHandlerFactory.createHandlerForLLM('llm1', config, 'test-session', 1);
    const llm2Handler = LLMHandlerFactory.createHandlerForLLM('llm2', config, 'test-session', 2);
    
    if (!llm1Handler || !llm2Handler) throw new Error('Handlers should be created');
    
    if (llm1Handler.constructor.name !== 'AnthropicHandler') {
      throw new Error('LLM1 should be Anthropic handler');
    }
    if (llm2Handler.constructor.name !== 'OpenAIHandler') {
      throw new Error('LLM2 should be OpenAI handler');
    }
    
    // Verify model resolution
    const llm1Model = ConversationAdapter.getModelForLLM('llm1', config);
    const llm2Model = ConversationAdapter.getModelForLLM('llm2', config);
    
    if (llm1Model !== 'claude-3-opus-20240229') throw new Error('LLM1 model mismatch');
    if (llm2Model !== 'gpt-4o-mini') throw new Error('LLM2 model mismatch');
  });
  
  // Factory Pattern Tests
  test('Factory createHandler method supports model parameter', () => {
    const config = createMockConfig();
    
    // Test direct handler creation with model parameter
    const handler = LLMHandlerFactory.createHandler('openai', config, 'test-session', 1, 'speaker_1', 'gpt-3.5-turbo');
    
    if (!handler) throw new Error('Handler should be created');
    if (handler.constructor.name !== 'OpenAIHandler') {
      throw new Error('Should create OpenAI handler');
    }
  });
  
  test('Factory createHandler method handles invalid provider', () => {
    const config = createMockConfig();
    
    try {
      LLMHandlerFactory.createHandler('invalid' as any, config, 'test-session', 1, 'speaker_1');
      throw new Error('Should have thrown error for invalid provider');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('Unsupported LLM provider')) {
        throw new Error(`Expected provider error, got: ${errorMessage}`);
      }
    }
  });
  
  // Summary
  console.log(`\n📊 Integration Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('❌ Some integration tests failed!');
    process.exit(1);
  } else {
    console.log('✅ All integration tests passed!');
  }
}

if (require.main === module) {
  runIntegrationTests();
}