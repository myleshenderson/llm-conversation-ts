#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';
import { createUploadService } from './upload-service';

interface UploadStats {
  successful: number;
  failed: number;
  total: number;
  errors: string[];
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  try {
    const config = loadConfig();
    const uploadService = createUploadService(config);

    console.log('🔍 Testing upload connection...');
    const connectionOk = await uploadService.testConnection();
    if (!connectionOk) {
      console.error('❌ Cannot connect to upload API');
      process.exit(1);
    }
    console.log('✅ Connection test successful');

    let filesToUpload: string[] = [];

    if (args.includes('--all')) {
      filesToUpload = findAllConversationFiles();
    } else if (args.includes('--recent')) {
      const recentIndex = args.indexOf('--recent');
      const count = parseInt(args[recentIndex + 1]) || 5;
      filesToUpload = findRecentConversationFiles(count);
    } else {
      filesToUpload = args.filter(arg => !arg.startsWith('--'));
    }

    if (filesToUpload.length === 0) {
      console.log('📁 No conversation files found to upload');
      return;
    }

    console.log(`📋 Found ${filesToUpload.length} files to upload`);
    const stats = await uploadFiles(uploadService, filesToUpload);
    printSummary(stats);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function uploadFiles(uploadService: any, files: string[]): Promise<UploadStats> {
  const stats: UploadStats = {
    successful: 0,
    failed: 0,
    total: files.length,
    errors: []
  };

  for (const file of files) {
    console.log(`📤 Uploading: ${path.basename(file)}`);
    
    const result = await uploadService.uploadFile(file);
    if (result.success) {
      console.log(`✅ Success: ${result.viewerUrl}`);
      stats.successful++;
    } else {
      console.log(`❌ Failed: ${result.error}`);
      stats.failed++;
      stats.errors.push(`${path.basename(file)}: ${result.error}`);
    }
  }

  return stats;
}

function findAllConversationFiles(): string[] {
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    return [];
  }
  
  return fs.readdirSync(logsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(logsDir, file));
}

function findRecentConversationFiles(count: number): string[] {
  const allFiles = findAllConversationFiles();
  return allFiles
    .map(file => ({ file, stats: fs.statSync(file) }))
    .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime())
    .slice(0, count)
    .map(item => item.file);
}

function printSummary(stats: UploadStats) {
  console.log('\n📊 Upload Summary:');
  console.log(`✅ Successful: ${stats.successful}`);
  console.log(`❌ Failed: ${stats.failed}`);
  console.log(`📁 Total: ${stats.total}`);
  
  if (stats.errors.length > 0) {
    console.log('\n🚨 Errors:');
    stats.errors.forEach(error => console.log(`  • ${error}`));
  }
}

function printHelp() {
  console.log(`
📤 Upload Existing Conversations

Usage:
  npx tsx src/upload-existing.ts [options] [files...]

Options:
  --all               Upload all conversation files from logs directory
  --recent <count>    Upload the N most recent files (default: 5)
  --help, -h          Show this help message

Examples:
  npx tsx src/upload-existing.ts --all
  npx tsx src/upload-existing.ts --recent 10
  npx tsx src/upload-existing.ts logs/conversation_123.json
  npx tsx src/upload-existing.ts logs/*.json
`);
}

if (require.main === module) {
  main();
}
