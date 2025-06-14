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
  
  // Use proper typing from the start
  const configData = config as Record<string, string | undefined>;
  
  for (const field of requiredFields) {
    if (!configData[field]) {
      console.error(`Error: Missing required config field: ${field}`);
      process.exit(1);
    }
  }
  
  // Validate provider values with proper typing
  const validProviders: LLMProvider[] = ['openai', 'anthropic'];
  const llm1Provider = configData['LLM1_PROVIDER'];
  const llm2Provider = configData['LLM2_PROVIDER'];
  
  if (!llm1Provider || !validProviders.includes(llm1Provider as LLMProvider)) {
    console.error(`Error: Invalid LLM1_PROVIDER value: ${llm1Provider}. Must be one of: ${validProviders.join(', ')}`);
    process.exit(1);
  }
  
  if (!llm2Provider || !validProviders.includes(llm2Provider as LLMProvider)) {
    console.error(`Error: Invalid LLM2_PROVIDER value: ${llm2Provider}. Must be one of: ${validProviders.join(', ')}`);
    process.exit(1);
  }
  
  // Now we can safely cast to LLMProvider since we've validated them
  const typedLlm1Provider = llm1Provider as LLMProvider;
  const typedLlm2Provider = llm2Provider as LLMProvider;
  
  // Validate provider-specific fields
  const providers = [typedLlm1Provider, typedLlm2Provider];
  
  for (const provider of providers) {
    const providerUpper = provider.toUpperCase();
    const providerRequiredFields = [
      `${providerUpper}_API_KEY`,
      `${providerUpper}_MODEL`,
      `${providerUpper}_BASE_URL`
    ];
    
    for (const field of providerRequiredFields) {
      if (!configData[field]) {
        console.error(`Error: Missing required config field: ${field} for provider: ${provider}`);
        process.exit(1);
      }
    }
  }

  // Validate model configurations if specified with proper type safety
  const llm1Model = configData['LLM1_MODEL'];
  const llm2Model = configData['LLM2_MODEL'];
  
  if (llm1Model && llm1Model.trim() !== '') {
    if (!isModelSupported(typedLlm1Provider, llm1Model)) {
      console.error(`Error: Invalid LLM1_MODEL '${llm1Model}' for provider '${typedLlm1Provider}'.`);
      console.error(`Supported models: ${getModelListForError(typedLlm1Provider)}`);
      process.exit(1);
    }
  }
  
  if (llm2Model && llm2Model.trim() !== '') {
    if (!isModelSupported(typedLlm2Provider, llm2Model)) {
      console.error(`Error: Invalid LLM2_MODEL '${llm2Model}' for provider '${typedLlm2Provider}'.`);
      console.error(`Supported models: ${getModelListForError(typedLlm2Provider)}`);
      process.exit(1);
    }
  }

  // Validate upload configuration if enabled
  if (configData['UPLOAD_ENABLED'] === 'true') {
    if (!configData['UPLOAD_API_URL']) {
      console.error('Error: UPLOAD_API_URL is required when UPLOAD_ENABLED is true');
      process.exit(1);
    }
  }
  
  // Build the properly typed config object
  const typedConfig: Config = {
    LLM1_PROVIDER: typedLlm1Provider,
    LLM2_PROVIDER: typedLlm2Provider,
    LLM1_MODEL: llm1Model || undefined,
    LLM2_MODEL: llm2Model || undefined,
    OPENAI_API_KEY: configData['OPENAI_API_KEY'] || '',
    OPENAI_MODEL: configData['OPENAI_MODEL'] || '',
    OPENAI_BASE_URL: configData['OPENAI_BASE_URL'] || '',
    ANTHROPIC_API_KEY: configData['ANTHROPIC_API_KEY'] || '',
    ANTHROPIC_MODEL: configData['ANTHROPIC_MODEL'] || '',
    ANTHROPIC_BASE_URL: configData['ANTHROPIC_BASE_URL'] || '',
    CONVERSATION_TOPIC: configData['CONVERSATION_TOPIC'] || '',
    MAX_TURNS: configData['MAX_TURNS'] || '',
    DELAY_BETWEEN_MESSAGES: configData['DELAY_BETWEEN_MESSAGES'] || ''
  };
  
  return typedConfig;
}
