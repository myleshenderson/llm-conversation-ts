#!/usr/bin/env node

/**
 * Debug utility to test API connectivity and authentication
 * Usage: npx tsx src/debug-api.ts
 */

import { loadConfig } from './config';

async function debugAPIConnectivity() {
  console.log('🔍 API Connectivity Debug Tool\n');

  try {
    const config = loadConfig();
    
    // Test OpenAI API
    console.log('## OpenAI API Test');
    console.log('==================');
    console.log(`Base URL: ${config.OPENAI_BASE_URL}`);
    console.log(`API Key: ${config.OPENAI_API_KEY ? `${config.OPENAI_API_KEY.substring(0, 7)}...` : 'NOT SET'}`);
    
    if (!config.OPENAI_API_KEY || config.OPENAI_API_KEY === 'sk-your-actual-openai-key-here') {
      console.log('❌ OpenAI API key not configured properly');
    } else {
      try {
        console.log('📡 Testing OpenAI models endpoint...');
        
        const response = await fetch(`${config.OPENAI_BASE_URL}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Response Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json() as { data?: any[] };
          const gptModels = data.data?.filter((model: any) => 
            model.id.includes('gpt-') && 
            !model.id.includes('instruct')
          ) || [];
          
          console.log(`✅ Success! Found ${gptModels.length} GPT models:`);
          gptModels.slice(0, 5).forEach((model: any, index: number) => {
            console.log(`  ${index + 1}. ${model.id}`);
          });
          if (gptModels.length > 5) {
            console.log(`  ... and ${gptModels.length - 5} more`);
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ Error Response: ${errorText}`);
          
          // Common error diagnosis
          if (response.status === 401) {
            console.log('\n🔧 Diagnosis: Authentication failed');
            console.log('   - Check that your OpenAI API key is valid');
            console.log('   - Ensure the key has not expired');
            console.log('   - Verify the key has the necessary permissions');
          } else if (response.status === 403) {
            console.log('\n🔧 Diagnosis: Permission denied');
            console.log('   - Your API key may not have model listing permissions');
          } else if (response.status === 429) {
            console.log('\n🔧 Diagnosis: Rate limited');
            console.log('   - Too many requests, try again later');
          }
        }
      } catch (error) {
        console.log(`❌ Network Error: ${error}`);
      }
    }
    
    console.log('\n');
    
    // Test Anthropic API  
    console.log('## Anthropic API Test');
    console.log('====================');
    console.log(`Base URL: ${config.ANTHROPIC_BASE_URL}`);
    console.log(`API Key: ${config.ANTHROPIC_API_KEY ? `${config.ANTHROPIC_API_KEY.substring(0, 7)}...` : 'NOT SET'}`);
    
    if (!config.ANTHROPIC_API_KEY || config.ANTHROPIC_API_KEY === 'sk-ant-your-actual-anthropic-key-here') {
      console.log('❌ Anthropic API key not configured properly');
    } else {
      try {
        console.log('📡 Testing Anthropic models endpoint...');
        
        const response = await fetch(`${config.ANTHROPIC_BASE_URL}/models`, {
          method: 'GET',
          headers: {
            'x-api-key': config.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`Response Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json() as { data?: any[] };
          const models = data.data || [];
          
          console.log(`✅ Success! Found ${models.length} models:`);
          models.slice(0, 5).forEach((model: any, index: number) => {
            console.log(`  ${index + 1}. ${model.id} (${model.display_name})`);
          });
          if (models.length > 5) {
            console.log(`  ... and ${models.length - 5} more`);
          }
        } else {
          const errorText = await response.text();
          console.log(`❌ Error Response: ${errorText}`);
          
          // Common error diagnosis
          if (response.status === 401) {
            console.log('\n🔧 Diagnosis: Authentication failed');
            console.log('   - Check that your Anthropic API key is valid');
            console.log('   - Ensure the key has not expired');
            console.log('   - Verify the key format (should start with "sk-ant-")');
          } else if (response.status === 403) {
            console.log('\n🔧 Diagnosis: Permission denied');
            console.log('   - Your API key may not have model listing permissions');
          }
        }
      } catch (error) {
        console.log(`❌ Network Error: ${error}`);
      }
    }
    
    console.log('\n## Recommendations');
    console.log('==================');
    console.log('1. Ensure API keys are valid and not expired');
    console.log('2. Check that keys have proper permissions');
    console.log('3. Verify network connectivity to API endpoints');
    console.log('4. Consider using static model registry if APIs are unavailable');
    console.log('\n💡 To use static models only: npx tsx src/list-models.ts');
    
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
  }
}

if (require.main === module) {
  debugAPIConnectivity().catch(console.error);
}