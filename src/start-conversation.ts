#!/usr/bin/env node

import { loadConfig } from './config';
import { createUploadService } from './upload-service';
import { execSync } from 'child_process';
import * as readline from 'readline';

const EXAMPLE_TOPICS = [
  "Explore the nature of consciousness and free will",
  "Debate the trolley problem and ethical decision making",
  "Discuss the meaning of life and human purpose",
  "Analyze the potential impact of quantum computing",
  "Discuss the future of human-AI collaboration",
  "Explore the possibilities of space colonization",
  "Examine the role of art in society",
  "Discuss the evolution of human communication",
  "Analyze the impact of globalization on local cultures",
  "Explore the mysteries of dark matter and dark energy",
  "Discuss breakthrough treatments in modern medicine",
  "Analyze the role of AI in scientific discovery",
  "Evaluate the future of cryptocurrency and digital finance",
  "Discuss sustainable business practices and climate change",
  "Analyze the gig economy and future of work",
  "Explore the relationship between creativity and technology",
  "Discuss the importance of storytelling in human culture",
  "Analyze the psychology of motivation and goal setting"
];

const RANDOM_TOPICS = [
  "Explore the potential of gene editing technology",
  "Discuss the impact of virtual reality on education",
  "Analyze the future of sustainable energy",
  "Debate the role of government in regulating AI",
  "Examine the psychology of decision making",
  "Discuss the evolution of human language",
  "Explore the possibilities of time travel",
  "Analyze the impact of automation on employment",
  "Debate the ethics of genetic enhancement",
  "Discuss the future of human longevity",
  "Explore the role of emotions in artificial intelligence",
  "Analyze the impact of climate change on civilization",
  "Discuss the potential of brain-computer interfaces",
  "Examine the philosophy of personal identity",
  "Explore the future of interstellar travel"
];

function showUsage() {
  console.log('🤖 LLM Conversation Starter (TypeScript)');
  console.log('');
  console.log('Usage:');
  console.log('  start-conversation [topic] [turns] [options]      - Start conversation with custom topic and turns');
  console.log('  start-conversation --examples                     - Show example topics');
  console.log('  start-conversation --random [turns] [options]     - Start with a random topic');
  console.log('  start-conversation --config                       - Show current configuration');
  console.log('  start-conversation --test-upload                  - Test upload API connection');
  console.log('  start-conversation --upload-file <path>           - Upload existing conversation file');
  console.log('');
  console.log('Options:');
  console.log('  --upload                                          - Force enable upload for this conversation');
  console.log('  --no-upload                                       - Force disable upload for this conversation');
  console.log('');
  console.log('Examples:');
  console.log('  start-conversation "Discuss the future of space exploration"');
  console.log('  start-conversation "Debate the pros and cons of remote work" 6');
  console.log('  start-conversation "Analyze the impact of social media" 15 --upload');
  console.log('  start-conversation --upload-file logs/conversation_123.json');
  console.log('');
  console.log('Parameters:');
  console.log('  topic  - The conversation topic (required)');
  console.log('  turns  - Number of turns (2-50, optional, defaults to config)');
}

function showExamples() {
  console.log('💡 Example Conversation Topics:');
  console.log('');
  console.log('🧠 Philosophy & Ethics:');
  EXAMPLE_TOPICS.slice(0, 3).forEach(topic => console.log(`  "${topic}"`));
  console.log('');
  console.log('🚀 Technology & Future:');
  EXAMPLE_TOPICS.slice(3, 6).forEach(topic => console.log(`  "${topic}"`));
  console.log('');
  console.log('🏛️ Society & Culture:');
  EXAMPLE_TOPICS.slice(6, 9).forEach(topic => console.log(`  "${topic}"`));
  console.log('');
  console.log('🔬 Science & Discovery:');
  EXAMPLE_TOPICS.slice(9, 12).forEach(topic => console.log(`  "${topic}"`));
  console.log('');
  console.log('💼 Business & Economics:');
  EXAMPLE_TOPICS.slice(12, 15).forEach(topic => console.log(`  "${topic}"`));
  console.log('');
  console.log('🎨 Creative & Personal:');
  EXAMPLE_TOPICS.slice(15, 18).forEach(topic => console.log(`  "${topic}"`));
}

function getRandomTopic(): string {
  const index = Math.floor(Math.random() * RANDOM_TOPICS.length);
  return RANDOM_TOPICS[index];
}

async function askUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function runConversation(topic: string, turns?: number, uploadOverride?: boolean) {
  try {
    console.log('💭 Topic:', topic);
    if (turns) {
      console.log('🔄 Turns:', turns);
    }
    console.log('');
    
    const answer = await askUser('Continue with conversation? (y/N): ');
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('Starting TypeScript conversation...');
      
      let command = turns 
        ? `npx tsx src/conversation.ts "${topic}" ${turns}`
        : `npx tsx src/conversation.ts "${topic}" 10`;
      
      // Add upload override if specified
      if (uploadOverride === true) {
        command += ' --upload';
      } else if (uploadOverride === false) {
        command += ' --no-upload';
      }
      
      execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    } else {
      console.log('Conversation cancelled.');
    }
  } catch (error) {
    console.error('Error running conversation:', error);
    process.exit(1);
  }
}

async function showConfig() {
  try {
    const config = loadConfig();
    console.log('⚙️ Current Configuration:');
    console.log('');
    
    // Basic settings
    console.log('🤖 Models:');
    console.log(`  OpenAI: ${config.OPENAI_MODEL}`);
    console.log(`  Anthropic: ${config.ANTHROPIC_MODEL}`);
    console.log('');
    
    // Upload settings
    console.log('📤 Upload Settings:');
    const uploadEnabled = config.UPLOAD_ENABLED === 'true';
    console.log(`  Enabled: ${uploadEnabled ? '✅' : '❌'} ${config.UPLOAD_ENABLED || 'false'}`);
    
    if (uploadEnabled) {
      console.log(`  API URL: ${config.UPLOAD_API_URL || 'Not set'}`);
      console.log(`  Auto Upload: ${config.AUTO_UPLOAD === 'true' ? '✅' : '❌'} ${config.AUTO_UPLOAD || 'false'}`);
      console.log(`  Max Retries: ${config.UPLOAD_MAX_RETRIES || '3'}`);
      console.log(`  Retry Delay: ${config.UPLOAD_RETRY_DELAY || '1000'}ms`);
      
      // Test connection
      if (config.UPLOAD_API_URL) {
        console.log('');
        console.log('🔍 Testing connection...');
        const uploadService = createUploadService(config);
        const connectionOk = await uploadService.testConnection();
        console.log(`  Connection: ${connectionOk ? '✅ OK' : '❌ Failed'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error loading configuration:', error instanceof Error ? error.message : String(error));
  }
}

async function testUpload() {
  try {
    const config = loadConfig();
    const uploadService = createUploadService(config);
    
    console.log('🔍 Testing upload connection...');
    const connectionOk = await uploadService.testConnection();
    
    if (connectionOk) {
      console.log('✅ Upload connection test successful!');
    } else {
      console.log('❌ Upload connection test failed');
      console.log('   Check your UPLOAD_API_URL configuration');
    }
  } catch (error) {
    console.error('❌ Error testing upload:', error instanceof Error ? error.message : String(error));
  }
}

async function uploadFile(filePath: string) {
  try {
    const config = loadConfig();
    const uploadService = createUploadService(config);
    
    console.log(`📤 Uploading file: ${filePath}`);
    const result = await uploadService.uploadFile(filePath);
    
    if (result.success) {
      console.log('✅ Upload successful!');
      console.log(`🌐 Online viewer: ${result.viewerUrl}`);
    } else {
      console.log(`❌ Upload failed: ${result.error}`);
    }
  } catch (error) {
    console.error('❌ Error uploading file:', error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  switch (command) {
    case '--examples':
    case '-e':
      showExamples();
      break;
      
    case '--random':
    case '-r': {
      const topic = getRandomTopic();
      let turns = undefined;
      let uploadOverride = undefined;
      
      // Parse arguments for random topic
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--upload') {
          uploadOverride = true;
        } else if (args[i] === '--no-upload') {
          uploadOverride = false;
        } else if (!isNaN(parseInt(args[i]))) {
          turns = parseInt(args[i]);
        }
      }
      
      console.log('🎲 Random topic selected:', topic);
      if (turns) {
        console.log('🔄 Turns:', turns);
      }
      console.log('');
      await runConversation(topic, turns, uploadOverride);
      break;
    }
    
    case '--config':
      await showConfig();
      break;
      
    case '--test-upload':
      await testUpload();
      break;
      
    case '--upload-file': {
      const filePath = args[1];
      if (!filePath) {
        console.error('❌ Error: Please provide a file path');
        console.log('Usage: start-conversation --upload-file <path>');
        process.exit(1);
      }
      await uploadFile(filePath);
      break;
    }
    
    case '--help':
    case '-h':
    case 'help':
    case '':
      showUsage();
      break;
      
    default: {
      const topic = command;
      let turns = undefined;
      let uploadOverride = undefined;
      
      // Parse arguments for custom topic
      for (let i = 1; i < args.length; i++) {
        if (args[i] === '--upload') {
          uploadOverride = true;
        } else if (args[i] === '--no-upload') {
          uploadOverride = false;
        } else if (!isNaN(parseInt(args[i]))) {
          turns = parseInt(args[i]);
        }
      }
      
      await runConversation(topic, turns, uploadOverride);
      break;
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}
