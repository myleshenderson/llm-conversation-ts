import * as fs from 'fs';
import * as path from 'path';
import { Config, LLMProvider } from './types';
import { isModelSupported, getModelListForError } from './model-registry';

export function loadConfig(): Config {
  const configPath = path.join(__dirname, '..', 'config.env');
  
  if (!fs.existsSync(configPath)) {
    console.error('Error: config.env file not found');
    process.exit(1);
  }
  
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const config: Partial<Config> = {};
  
  for (const line of configContent.split('\n')) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      (config as any)[key] = value;
    }
  }
  
  // Validate required fields
  const requiredFields = [
    'LLM1_PROVIDER',
    'LLM2_PROVIDER',
    'CONVERSATION_TOPIC',
    'MAX_TURNS',
    'DELAY_BETWEEN_MESSAGES'
  ];
  
  for (const field of requiredFields) {
    if (!(config as any)[field]) {
      console.error(`Error: Missing required config field: ${field}`);
      process.exit(1);
    }
  }
  
  // Validate provider values
  const validProviders = ['openai', 'anthropic'];
  const llm1Provider = (config as any)['LLM1_PROVIDER'];
  const llm2Provider = (config as any)['LLM2_PROVIDER'];
  
  if (!validProviders.includes(llm1Provider)) {
    console.error(`Error: Invalid LLM1_PROVIDER value: ${llm1Provider}. Must be one of: ${validProviders.join(', ')}`);
    process.exit(1);
  }
  
  if (!validProviders.includes(llm2Provider)) {
    console.error(`Error: Invalid LLM2_PROVIDER value: ${llm2Provider}. Must be one of: ${validProviders.join(', ')}`);
    process.exit(1);
  }
  
  // Validate provider-specific fields
  const providers = [llm1Provider, llm2Provider];
  
  for (const provider of providers) {
    if (!provider) continue;
    
    const providerUpper = provider.toUpperCase();
    const providerRequiredFields = [
      `${providerUpper}_API_KEY`,
      `${providerUpper}_MODEL`,
      `${providerUpper}_BASE_URL`
    ];
    
    for (const field of providerRequiredFields) {
      if (!(config as any)[field]) {
        console.error(`Error: Missing required config field: ${field} for provider: ${provider}`);
        process.exit(1);
      }
    }
  }

  // Validate model configurations if specified
  const llm1Model = (config as any)['LLM1_MODEL'];
  const llm2Model = (config as any)['LLM2_MODEL'];
  
  if (llm1Model && llm1Provider && (llm1Provider === 'openai' || llm1Provider === 'anthropic')) {
    if (!isModelSupported(llm1Provider, llm1Model)) {
      console.error(`Error: Invalid LLM1_MODEL '${llm1Model}' for provider '${llm1Provider}'.`);
      console.error(`Supported models: ${getModelListForError(llm1Provider)}`);
      process.exit(1);
    }
  }
  
  if (llm2Model && llm2Provider && (llm2Provider === 'openai' || llm2Provider === 'anthropic')) {
    if (!isModelSupported(llm2Provider, llm2Model)) {
      console.error(`Error: Invalid LLM2_MODEL '${llm2Model}' for provider '${llm2Provider}'.`);
      console.error(`Supported models: ${getModelListForError(llm2Provider)}`);
      process.exit(1);
    }
  }

  // Validate upload configuration if enabled
  if ((config as any)['UPLOAD_ENABLED'] === 'true') {
    if (!(config as any)['UPLOAD_API_URL']) {
      console.error('Error: UPLOAD_API_URL is required when UPLOAD_ENABLED is true');
      process.exit(1);
    }
  }
  
  return config as Config;
}
