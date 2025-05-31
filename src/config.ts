import * as fs from 'fs';
import * as path from 'path';
import { Config } from './types';

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
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'OPENAI_MODEL',
    'ANTHROPIC_MODEL',
    'OPENAI_BASE_URL',
    'ANTHROPIC_BASE_URL'
  ];
  
  for (const field of requiredFields) {
    if (!(config as any)[field]) {
      console.error(`Error: Missing required config field: ${field}`);
      process.exit(1);
    }
  }
  
  return config as Config;
}
