#!/usr/bin/env node

/**
 * Tests for dynamic model registry functionality
 * Run with: npx tsx src/dynamic-model-tests.ts
 */

import { 
  getDynamicSupportedModels, 
  isDynamicModelSupported, 
  getDynamicModelListForError,
  clearModelCache,
  getModelCacheStatus
} from './dynamic-model-registry';
import { LLMProvider } from './types';

// Mock fetch for testing
const originalFetch = global.fetch;

function mockFetch(mockResponses: Record<string, any>) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    const mockResponse = mockResponses[url] || mockResponses['default'];
    
    if (mockResponse.error) {
      return Promise.reject(new Error(mockResponse.error));
    }
    
    return Promise.resolve({
      ok: mockResponse.ok !== false,
      status: mockResponse.status || 200,
      statusText: mockResponse.statusText || 'OK',
      json: () => Promise.resolve(mockResponse.data)
    });
  }) as any;
}

function restoreFetch() {
  global.fetch = originalFetch;
}

async function runDynamicModelTests() {
  console.log('🔧 Running dynamic model registry tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name: string, testFn: () => Promise<void>) {
    return testFn()
      .then(() => {
        console.log(`✅ ${name}`);
        passed++;
      })
      .catch((error) => {
        console.log(`❌ ${name}: ${error}`);
        failed++;
      });
  }
  
  // Test 1: Cache functionality
  await test('Cache functionality works correctly', async () => {
    clearModelCache();
    
    // Mock Anthropic API response
    mockFetch({
      'https://api.anthropic.com/v1/models': {
        data: {
          data: [
            { id: 'claude-3-5-sonnet-20241022', display_name: 'Claude 3.5 Sonnet', created_at: '2024-10-22T00:00:00Z', type: 'model' },
            { id: 'claude-3-5-haiku-20241022', display_name: 'Claude 3.5 Haiku', created_at: '2024-10-22T00:00:00Z', type: 'model' }
          ],
          has_more: false,
          first_id: null,
          last_id: null
        }
      }
    });
    
    // First call should fetch from API
    const models1 = await getDynamicSupportedModels('anthropic', 'test-key', 'https://api.anthropic.com/v1');
    
    // Check cache status
    const cacheStatus = getModelCacheStatus();
    if (!cacheStatus.anthropic.cached) {
      throw new Error('Models should be cached after first call');
    }
    
    // Second call should use cache (no additional fetch)
    const models2 = await getDynamicSupportedModels('anthropic', 'test-key', 'https://api.anthropic.com/v1');
    
    if (JSON.stringify(models1) !== JSON.stringify(models2)) {
      throw new Error('Cached results should match original results');
    }
    
    restoreFetch();
  });
  
  // Test 2: Anthropic API integration
  await test('Anthropic API integration works', async () => {
    clearModelCache();
    
    mockFetch({
      'https://api.anthropic.com/v1/models': {
        data: {
          data: [
            { id: 'claude-3-5-sonnet-20241022', display_name: 'Claude 3.5 Sonnet', created_at: '2024-10-22T00:00:00Z', type: 'model' },
            { id: 'claude-3-opus-20240229', display_name: 'Claude 3 Opus', created_at: '2024-02-29T00:00:00Z', type: 'model' }
          ],
          has_more: false,
          first_id: null,
          last_id: null
        }
      }
    });
    
    const models = await getDynamicSupportedModels('anthropic', 'test-key', 'https://api.anthropic.com/v1');
    
    if (!models.includes('claude-3-5-sonnet-20241022')) {
      throw new Error('Should include Claude 3.5 Sonnet');
    }
    if (!models.includes('claude-3-opus-20240229')) {
      throw new Error('Should include Claude 3 Opus');
    }
    
    restoreFetch();
  });
  
  // Test 3: OpenAI API integration
  await test('OpenAI API integration works', async () => {
    clearModelCache();
    
    mockFetch({
      'https://api.openai.com/v1/models': {
        data: {
          object: 'list',
          data: [
            { id: 'gpt-4', object: 'model', created: 1687882411, owned_by: 'openai' },
            { id: 'gpt-4-turbo', object: 'model', created: 1687882411, owned_by: 'openai' },
            { id: 'gpt-3.5-turbo', object: 'model', created: 1687882411, owned_by: 'openai' },
            { id: 'davinci-002', object: 'model', created: 1687882411, owned_by: 'openai' }, // Should be filtered out
            { id: 'ada-002', object: 'model', created: 1687882411, owned_by: 'openai' } // Should be filtered out
          ]
        }
      }
    });
    
    const models = await getDynamicSupportedModels('openai', 'test-key', 'https://api.openai.com/v1');
    
    if (!models.includes('gpt-4')) {
      throw new Error('Should include gpt-4');
    }
    if (!models.includes('gpt-4-turbo')) {
      throw new Error('Should include gpt-4-turbo');
    }
    if (models.includes('davinci-002')) {
      throw new Error('Should filter out non-GPT models');
    }
    
    restoreFetch();
  });
  
  // Test 4: API error fallback
  await test('API error fallback works correctly', async () => {
    clearModelCache();
    
    mockFetch({
      'https://api.anthropic.com/v1/models': {
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      }
    });
    
    // Should fallback to static list when API fails
    const models = await getDynamicSupportedModels('anthropic', 'invalid-key', 'https://api.anthropic.com/v1');
    
    // Should get static fallback models
    if (!models.includes('claude-3-5-sonnet-20241022')) {
      throw new Error('Should fallback to static models when API fails');
    }
    
    restoreFetch();
  });
  
  // Test 5: Model validation
  await test('Dynamic model validation works', async () => {
    clearModelCache();
    
    mockFetch({
      'https://api.anthropic.com/v1/models': {
        data: {
          data: [
            { id: 'claude-3-5-sonnet-20241022', display_name: 'Claude 3.5 Sonnet', created_at: '2024-10-22T00:00:00Z', type: 'model' }
          ],
          has_more: false,
          first_id: null,
          last_id: null
        }
      }
    });
    
    const isValid = await isDynamicModelSupported('anthropic', 'claude-3-5-sonnet-20241022', 'test-key', 'https://api.anthropic.com/v1');
    const isInvalid = await isDynamicModelSupported('anthropic', 'invalid-model', 'test-key', 'https://api.anthropic.com/v1');
    
    if (!isValid) {
      throw new Error('claude-3-5-sonnet-20241022 should be valid');
    }
    if (isInvalid) {
      throw new Error('invalid-model should not be valid');
    }
    
    restoreFetch();
  });
  
  // Test 6: Error message generation
  await test('Dynamic error message generation works', async () => {
    clearModelCache();
    
    mockFetch({
      'https://api.openai.com/v1/models': {
        data: {
          object: 'list',
          data: [
            { id: 'gpt-4', object: 'model', created: 1687882411, owned_by: 'openai' },
            { id: 'gpt-3.5-turbo', object: 'model', created: 1687882411, owned_by: 'openai' }
          ]
        }
      }
    });
    
    const errorList = await getDynamicModelListForError('openai', 'test-key', 'https://api.openai.com/v1');
    
    if (!errorList.includes('gpt-4')) {
      throw new Error('Error list should include gpt-4');
    }
    if (!errorList.includes(', ')) {
      throw new Error('Error list should be comma-separated');
    }
    
    restoreFetch();
  });
  
  // Test 7: Fallback to static when no API credentials
  await test('Fallback to static models when no credentials provided', async () => {
    clearModelCache();
    
    const models = await getDynamicSupportedModels('anthropic');
    
    // Should get static models when no API credentials provided
    if (!models.includes('claude-3-5-sonnet-20241022')) {
      throw new Error('Should fallback to static models when no credentials');
    }
  });
  
  console.log(`\n📊 Dynamic Model Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('❌ Some dynamic model tests failed!');
    process.exit(1);
  } else {
    console.log('✅ All dynamic model tests passed!');
    console.log('🎉 Dynamic model registry is working correctly!');
  }
}

// Mock jest for standalone execution
if (!global.jest) {
  (global as any).jest = {
    fn: () => ({
      mockImplementation: (impl: any) => impl
    })
  };
}

if (require.main === module) {
  runDynamicModelTests().catch(console.error);
}