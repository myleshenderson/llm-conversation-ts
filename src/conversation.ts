#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';
import { Logger } from './logger';
import { OpenAIHandler } from './openai-handler';
import { AnthropicHandler } from './anthropic-handler';
import { ComprehensiveConversation, TurnMetadata } from './types';

function generateSessionId(topic: string): string {
  const topicSlug = topic.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').replace('T', '_').substring(0, 15);
  return `conversation_${timestamp}_${topicSlug}`;
}

function collectTurnData(logDir: string, sessionId: string): {
  turns: TurnMetadata[];
  totalTokens: number;
  openaiTokens: number;
  anthropicTokens: number;
} {
  const turnFiles = fs.readdirSync(logDir)
    .filter(file => file.startsWith(`${sessionId}_turn_`) && file.endsWith('.json'))
    .sort();
  
  const turns: TurnMetadata[] = [];
  let totalTokens = 0;
  let openaiTokens = 0;
  let anthropicTokens = 0;
  
  for (const turnFile of turnFiles) {
    try {
      const turnData = JSON.parse(fs.readFileSync(path.join(logDir, turnFile), 'utf-8'));
      turns.push(turnData);
      
      const tokens = turnData.tokens?.total || 0;
      totalTokens += tokens;
      
      if (turnData.speaker === 'openai') {
        openaiTokens += tokens;
      } else {
        anthropicTokens += tokens;
      }
    } catch (error) {
      console.error(`Error reading ${turnFile}:`, error);
    }
  }
  
  return { turns, totalTokens, openaiTokens, anthropicTokens };
}

function createComprehensiveJson(
  sessionId: string,
  topic: string,
  maxTurns: number,
  actualTurns: number,
  config: any,
  startTimestamp: string,
  endTimestamp: string,
  duration: number,
  turns: TurnMetadata[],
  totalTokens: number,
  openaiTokens: number,
  anthropicTokens: number,
  logDir: string
): string {
  // Calculate average response time
  const avgResponseTime = turns.length > 0 
    ? turns.reduce((sum, turn) => sum + (turn.response_time_ms || 0), 0) / turns.length
    : 0;
  
  const comprehensiveData: ComprehensiveConversation = {
    metadata: {
      session_id: sessionId,
      created_at: startTimestamp,
      completed_at: endTimestamp,
      duration_seconds: duration,
      status: 'completed',
      version: '2.0',
      features: ['conversation_history', 'context_aware', 'typescript_native']
    },
    conversation: {
      topic,
      max_turns: maxTurns,
      actual_turns: actualTurns
    },
    models: {
      openai: {
        model: config.OPENAI_MODEL,
        api_base: config.OPENAI_BASE_URL
      },
      anthropic: {
        model: config.ANTHROPIC_MODEL,
        api_base: config.ANTHROPIC_BASE_URL
      }
    },
    statistics: {
      total_tokens: totalTokens,
      openai_tokens: openaiTokens,
      anthropic_tokens: anthropicTokens,
      average_response_time_ms: avgResponseTime
    },
    turns
  };
  
  // Write comprehensive JSON
  const outputFile = path.join(logDir, `${sessionId}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(comprehensiveData, null, 2));
  
  return outputFile;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('Usage: conversation.ts <topic> <max_turns>');
    process.exit(1);
  }
  
  const topic = args[0];
  const maxTurns = parseInt(args[1]);
  
  if (maxTurns < 2 || maxTurns > 50) {
    console.error('Error: max_turns must be between 2 and 50');
    process.exit(1);
  }
  
  // Load configuration
  const config = loadConfig();
  
  // Setup directories and files
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Generate session ID
  const sessionId = generateSessionId(topic);
  const sessionLog = path.join(logDir, `${sessionId}.log`);
  
  // Initialize session log
  const sessionHeader = [
    `=== LLM Conversation Session: ${sessionId} ===`,
    `Topic: ${topic}`,
    `Max Turns: ${maxTurns}`,
    `Models: OpenAI(${config.OPENAI_MODEL}) <-> Anthropic(${config.ANTHROPIC_MODEL})`,
    '='.repeat(50),
    ''
  ].join('\n');
  
  fs.writeFileSync(sessionLog, sessionHeader);
  
  const startTime = Date.now();
  const startTimestamp = new Date().toISOString();
  
  const logger = new Logger(sessionLog);
  logger.log('INFO', `Starting conversation session: ${sessionId}`);
  logger.log('INFO', `Topic: ${topic}`);
  
  // Main conversation loop
  let currentMessage = topic;
  let turnCount = 0;
  
  try {
    while (turnCount < maxTurns) {
      // OpenAI turn
      turnCount++;
      logger.log('INFO', `Turn ${turnCount}/${maxTurns}: OpenAI (with conversation history)`);
      
      const openaiHandler = new OpenAIHandler(config, sessionId, turnCount);
      const openaiResult = await openaiHandler.processMessage(currentMessage, sessionId, turnCount);
      
      logger.log('INFO', 'OpenAI response received');
      currentMessage = openaiResult.response;
      
      if (turnCount >= maxTurns) {
        break;
      }
      
      // Delay between messages
      const delay = parseFloat(config.DELAY_BETWEEN_MESSAGES || '2') * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Anthropic turn
      turnCount++;
      logger.log('INFO', `Turn ${turnCount}/${maxTurns}: Anthropic (with conversation history)`);
      
      const anthropicHandler = new AnthropicHandler(config, sessionId, turnCount);
      const anthropicResult = await anthropicHandler.processMessage(currentMessage, sessionId, turnCount);
      
      logger.log('INFO', 'Anthropic response received');
      currentMessage = anthropicResult.response;
      
      // Delay between exchanges
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const endTime = Date.now();
    const endTimestamp = new Date().toISOString();
    const duration = Math.floor((endTime - startTime) / 1000);
    
    logger.log('INFO', `Conversation completed after ${turnCount} turns`);
    logger.log('INFO', 'Building comprehensive JSON export...');
    
    // Collect turn data and create comprehensive JSON
    const { turns, totalTokens, openaiTokens, anthropicTokens } = collectTurnData(logDir, sessionId);
    
    const jsonOutput = createComprehensiveJson(
      sessionId,
      topic,
      maxTurns,
      turnCount,
      config,
      startTimestamp,
      endTimestamp,
      duration,
      turns,
      totalTokens,
      openaiTokens,
      anthropicTokens,
      logDir
    );
    
    logger.log('INFO', `Comprehensive JSON export completed: ${jsonOutput}`);
    
    // Print summary
    console.log('\n🎉 Conversation with context completed!');
    console.log(`\n📁 Files created:`);
    console.log(`  📋 Main log: ${sessionLog}`);
    console.log(`  📊 JSON export: ${jsonOutput}`);
    console.log(`  🧠 Conversation history: ${path.join(logDir, `${sessionId}_history.json`)}`);
    console.log(`\n📊 Statistics:`);
    console.log(`  🔄 Turns: ${turnCount}`);
    console.log(`  🕒 Duration: ${duration}s`);
    console.log(`  💬 Total tokens: ${totalTokens}`);
    console.log(`  🤖 OpenAI tokens: ${openaiTokens}`);
    console.log(`  🟣 Anthropic tokens: ${anthropicTokens}`);
    console.log('\n🌐 JSON file is ready for web display and analysis!');
    console.log('✨ Full conversation context maintained for natural AI interactions!');
    
  } catch (error) {
    logger.log('ERROR', `Conversation failed: ${error}`);
    console.error('Conversation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
