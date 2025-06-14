#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';
import { Logger } from './logger';
import { createUploadService } from './upload-service';
import { ComprehensiveConversation, TurnMetadata, LLMIdentifier, LLMProvider } from './types';
import { LLMHandlerFactory } from './llm-handler-factory';

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
      
      // Still track by provider for statistics
      if (turnData.speaker === 'openai') {
        openaiTokens += tokens;
      } else if (turnData.speaker === 'anthropic') {
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
  logDir: string,
  llm1Provider: LLMProvider,
  llm2Provider: LLMProvider
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
      ...(llm1Provider === 'openai' || llm2Provider === 'openai' ? {
        openai: {
          model: config.OPENAI_MODEL,
          api_base: config.OPENAI_BASE_URL
        }
      } : {}),
      ...(llm1Provider === 'anthropic' || llm2Provider === 'anthropic' ? {
        anthropic: {
          model: config.ANTHROPIC_MODEL,
          api_base: config.ANTHROPIC_BASE_URL
        }
      } : {})
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
  
  if (args.length < 2) {
    console.error('Usage: conversation.ts <topic> <max_turns> [--upload|--no-upload]');
    process.exit(1);
  }
  
  const topic = args[0];
  const maxTurns = parseInt(args[1]);
  
  // Parse upload override from command line
  let uploadOverride: boolean | undefined = undefined;
  if (args.includes('--upload')) {
    uploadOverride = true;
  } else if (args.includes('--no-upload')) {
    uploadOverride = false;
  }
  
  if (maxTurns < 2 || maxTurns > 50) {
    console.error('Error: max_turns must be between 2 and 50');
    process.exit(1);
  }
  
  // Load configuration
  const config = loadConfig();
  
  // Get providers for LLM1 and LLM2
  const llm1Provider = LLMHandlerFactory.getProviderForLLM('llm1', config);
  const llm2Provider = LLMHandlerFactory.getProviderForLLM('llm2', config);
  
  // Setup directories and files
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Generate session ID
  const sessionId = generateSessionId(topic);
  const sessionLog = path.join(logDir, `${sessionId}.log`);
  
  // Get models for display
  const llm1Model = llm1Provider === 'openai' ? config.OPENAI_MODEL : config.ANTHROPIC_MODEL;
  const llm2Model = llm2Provider === 'openai' ? config.OPENAI_MODEL : config.ANTHROPIC_MODEL;
  
  // Initialize session log
  const sessionHeader = [
    `=== LLM Conversation Session: ${sessionId} ===`,
    `Topic: ${topic}`,
    `Max Turns: ${maxTurns}`,
    `Models: LLM1(${llm1Provider}:${llm1Model}) <-> LLM2(${llm2Provider}:${llm2Model})`,
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
      // LLM1 turn
      turnCount++;
      logger.log('INFO', `Turn ${turnCount}/${maxTurns}: LLM1 (${llm1Provider}) (with conversation history)`);
      
      const llm1Handler = LLMHandlerFactory.createHandler(llm1Provider, config, sessionId, turnCount);
      const llm1Result = await llm1Handler.processMessage(currentMessage, sessionId, turnCount);
      
      logger.log('INFO', `LLM1 (${llm1Provider}) response received`);
      currentMessage = llm1Result.response;
      
      if (turnCount >= maxTurns) {
        break;
      }
      
      // Delay between messages
      const delay = parseFloat(config.DELAY_BETWEEN_MESSAGES || '2') * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // LLM2 turn
      turnCount++;
      logger.log('INFO', `Turn ${turnCount}/${maxTurns}: LLM2 (${llm2Provider}) (with conversation history)`);
      
      const llm2Handler = LLMHandlerFactory.createHandler(llm2Provider, config, sessionId, turnCount);
      const llm2Result = await llm2Handler.processMessage(currentMessage, sessionId, turnCount);
      
      logger.log('INFO', `LLM2 (${llm2Provider}) response received`);
      currentMessage = llm2Result.response;
      
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
      logDir,
      llm1Provider,
      llm2Provider
    );
    
    logger.log('INFO', `Comprehensive JSON export completed: ${jsonOutput}`);
    
    // Handle upload if enabled
    let uploadResult = null;
    const shouldUpload = uploadOverride !== undefined ? uploadOverride : config.AUTO_UPLOAD === 'true';
    
    if (shouldUpload && config.UPLOAD_ENABLED === 'true') {
      try {
        logger.log('INFO', 'Attempting to upload conversation...');
        const uploadService = createUploadService(config);
        
        // Read the comprehensive conversation data
        const conversationData: ComprehensiveConversation = JSON.parse(fs.readFileSync(jsonOutput, 'utf-8'));
        uploadResult = await uploadService.uploadConversation(conversationData, sessionId);
        
        if (uploadResult.success) {
          logger.log('INFO', `Upload successful: ${uploadResult.viewerUrl}`);
        } else {
          logger.log('ERROR', `Upload failed: ${uploadResult.error}`);
        }
      } catch (uploadError) {
        logger.log('ERROR', `Upload error: ${uploadError}`);
        uploadResult = { success: false, error: String(uploadError) };
      }
    }
    
    // Print summary
    console.log('\n🎉 Conversation with context completed!');
    console.log(`\n📁 Files created:`);
    console.log(`  📋 Main log: ${sessionLog}`);
    console.log(`  📊 JSON export: ${jsonOutput}`);
    console.log(`  🧠 Conversation history: ${path.join(logDir, `${sessionId}_history.json`)}`);
    
    // Upload status
    if (shouldUpload && config.UPLOAD_ENABLED === 'true') {
      if (uploadResult?.success) {
        console.log(`\n🌐 Online viewer: ${uploadResult.viewerUrl}`);
      } else {
        console.log(`\n❌ Upload failed: ${uploadResult?.error || 'Unknown error'}`);
      }
    }
    
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
