#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../src/config';
import { Logger } from '../src/logger';
import { AnalysisService } from '../src/analysis-service';
import { ComprehensiveConversation } from '../src/types';

async function analyzeExistingConversations() {
  const config = loadConfig();
  const logDir = path.join(process.cwd(), 'logs');
  
  if (!config.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY required for analysis');
    process.exit(1);
  }

  const logger = new Logger(path.join(logDir, 'batch_analysis.log'));
  const analysisService = new AnalysisService(config.OPENAI_API_KEY, config.ANALYSIS_MODEL || 'gpt-4o-mini', logger);

  // Find all conversation JSON files
  const jsonFiles = fs.readdirSync(logDir)
    .filter(file => file.startsWith('conversation_') && file.endsWith('.json'))
    .filter(file => !file.includes('_analyzed'));

  console.log(`Found ${jsonFiles.length} conversations to analyze`);

  for (const file of jsonFiles) {
    try {
      console.log(`Analyzing ${file}...`);
      
      const filePath = path.join(logDir, file);
      const conversationData: ComprehensiveConversation = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Skip if already has analysis
      if ('analysis' in conversationData) {
        console.log(`  ⏭️  Already analyzed, skipping`);
        continue;
      }

      const analysis = await analysisService.analyzeConversation(conversationData);
      
      // Create analyzed version
      const analyzedConversation = {
        ...conversationData,
        analysis
      };

      // Save analyzed version
      const analyzedPath = path.join(logDir, file.replace('.json', '_analyzed.json'));
      fs.writeFileSync(analyzedPath, JSON.stringify(analyzedConversation, null, 2));
      
      console.log(`  ✅ Hook: ${analysis.hook_strength}/10 - ${analysis.brief_explanation}`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`  ❌ Failed to analyze ${file}:`, error);
    }
  }

  console.log('\nBatch analysis complete!');
}

if (require.main === module) {
  analyzeExistingConversations().catch(console.error);
}