#!/usr/bin/env node

import { loadConfig } from './config';
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
  console.log('  start-conversation [topic] [turns]                - Start conversation with custom topic and turns');
  console.log('  start-conversation --examples                     - Show example topics');
  console.log('  start-conversation --random [turns]               - Start with a random topic');
  console.log('');
  console.log('Examples:');
  console.log('  start-conversation "Discuss the future of space exploration"');
  console.log('  start-conversation "Debate the pros and cons of remote work" 6');
  console.log('  start-conversation "Analyze the impact of social media" 15');
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

async function runConversation(topic: string, turns?: number) {
  try {
    console.log('💭 Topic:', topic);
    if (turns) {
      console.log('🔄 Turns:', turns);
    }
    console.log('');
    
    const answer = await askUser('Continue with conversation? (y/N): ');
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('Starting TypeScript conversation...');
      
      const command = turns 
        ? `npx tsx src/conversation.ts "${topic}" ${turns}`
        : `npx tsx src/conversation.ts "${topic}" 10`;
      
      execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    } else {
      console.log('Conversation cancelled.');
    }
  } catch (error) {
    console.error('Error running conversation:', error);
    process.exit(1);
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
      const turns = args[1] ? parseInt(args[1]) : undefined;
      console.log('🎲 Random topic selected:', topic);
      if (turns) {
        console.log('🔄 Turns:', turns);
      }
      console.log('');
      await runConversation(topic, turns);
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
      const turns = args[1] ? parseInt(args[1]) : undefined;
      await runConversation(topic, turns);
      break;
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}
