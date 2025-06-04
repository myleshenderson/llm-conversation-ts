# Semantic Analysis Integration Plan
*Adding conversation analysis to llm-conversation-ts generation pipeline*

## Overview

This plan adds semantic analysis capabilities to your existing LLM conversation generation pipeline. The analysis will run immediately after conversation generation but before upload, providing structured metadata about conversation quality and entertainment value.

## Implementation Plan

### Phase 1: Add Dependencies & Types (15 mins)

#### 1.1 Update package.json
Add OpenAI client for analysis:
```bash
npm install openai
npm install --save-dev @types/openai
```

#### 1.2 Extend types.ts
Add analysis interfaces to your existing types:

```typescript
export interface ConversationAnalysis {
  ontological_depth: number;        // 0-10
  journey_surprise: number;         // 0-10  
  logical_coherence: number;        // 0-10
  hook_strength: number;            // 0-10
  shareability_factors: string[];
  conversation_type: 'rabbit_hole' | 'circle_back' | 'escalating_depth' | 'tangent_cascade';
  brief_explanation: string;
  conversation_summary: string;
  analysis_timestamp: string;
  analysis_model: string;
}

export interface AnalyzedConversation extends ComprehensiveConversation {
  analysis: ConversationAnalysis;
}
```

#### 1.3 Update config
Add analysis configuration to config.env:
```bash
# Analysis Settings
ANALYSIS_ENABLED=true
ANALYSIS_MODEL=gpt-4o-mini
ANALYSIS_HOOK_THRESHOLD=6
ANALYSIS_FEATURE_THRESHOLD=8
```

### Phase 2: Create Analysis Service (45 mins)

#### 2.1 Create src/analysis-service.ts
```typescript
import OpenAI from 'openai';
import { ComprehensiveConversation, ConversationAnalysis, TurnMetadata } from './types';
import { Logger } from './logger';

export class AnalysisService {
  private openai: OpenAI;
  private logger: Logger;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini', logger: Logger) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
    this.logger = logger;
  }

  async analyzeConversation(conversation: ComprehensiveConversation): Promise<ConversationAnalysis> {
    const startTime = Date.now();
    this.logger.log('INFO', 'Starting semantic analysis...');

    try {
      const analysisPrompt = this.buildAnalysisPrompt(conversation);
      
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const analysisText = response.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('No analysis response received');
      }

      // Parse JSON response
      const analysis = this.parseAnalysisResponse(analysisText);
      
      const analysisTime = Date.now() - startTime;
      this.logger.log('INFO', `Analysis completed in ${analysisTime}ms`);
      this.logger.log('INFO', `Scores - Depth: ${analysis.ontological_depth}, Surprise: ${analysis.journey_surprise}, Coherence: ${analysis.logical_coherence}, Hook: ${analysis.hook_strength}`);

      return analysis;

    } catch (error) {
      this.logger.log('ERROR', `Analysis failed: ${error}`);
      throw error;
    }
  }

  private buildAnalysisPrompt(conversation: ComprehensiveConversation): string {
    const conversationText = this.formatConversationForAnalysis(conversation);
    
    return `You are analyzing a conversation between two AI systems to determine its entertainment and shareability value. Score the conversation on four key criteria:

**ONTOLOGICAL DEPTH (0-10 scale)**
Rate how deeply the conversation explores fundamental questions about consciousness, reality, intelligence, existence, or the nature of mind. Look for:
- Questions about what it means to be conscious or intelligent
- Discussions of subjective experience, qualia, or awareness
- Explorations of reality, simulation, or existence
- Debates about the nature of intelligence (artificial vs human)
- Philosophical inquiries into meaning, purpose, or identity

Score 0-3: Surface level, no philosophical depth
Score 4-6: Some deeper questions touched on briefly  
Score 7-8: Significant philosophical exploration
Score 9-10: Profound ontological insights or revelations

**JOURNEY SURPRISE (0-10 scale)**
Rate how unexpected the conversation's trajectory was given its starting point. Consider:
- How mundane/ordinary was the initial topic?
- How dramatically did the conversation shift direction?
- Would a human reader be surprised by where it ended up?
- Does the path feel genuinely emergent vs. predictable?

Score 0-3: Predictable progression, stayed on expected topics
Score 4-6: Some interesting tangents but generally expected
Score 7-8: Surprising evolution that feels organic
Score 9-10: Completely unexpected journey that defies prediction

**LOGICAL COHERENCE (0-10 scale)**
Rate whether the conversation's evolution makes sense in retrospect. Even if surprising, the connections should feel valid:
- Can you trace the logical steps from start to finish?
- Do the topic transitions have reasonable bridges?
- Would the reasoning hold up to scrutiny?
- Does it feel like genuine intellectual discovery vs. random jumping?

Score 0-3: Incoherent jumps, no clear logical path
Score 4-6: Some logical gaps but generally followable
Score 7-8: Clear logical progression with valid connections
Score 9-10: Brilliant logical chain that illuminates real insights

**HOOK STRENGTH (0-10 scale)**
Rate how compelling this conversation would be to share based on these specific factors:
- **Premise surprise** (0-3): How unexpected is the basic "X conversation became about Y" story?
- **Relatability** (0-3): How familiar/accessible is the starting topic to general audiences?
- **Payoff clarity** (0-2): How easy is it to explain why the ending is interesting?
- **Story completeness** (0-2): Does it feel like a complete journey vs. just rambling?

Sum these components for your hook_strength score.

Examples:
- "Pizza recipes → consciousness debate" = Premise surprise (3) + Relatability (3) + Clear payoff (2) + Complete story (2) = 10
- "Quantum physics → deeper quantum insights" = Premise surprise (1) + Relatability (1) + Unclear payoff (1) + Incomplete (1) = 4

**OUTPUT FORMAT:**
Respond with valid JSON only:
\`\`\`json
{
  "ontological_depth": X,
  "journey_surprise": X, 
  "logical_coherence": X,
  "hook_strength": X,
  "shareability_factors": [
    "mundane_to_profound_arc",
    "consciousness_debate", 
    "unexpected_connection",
    "quotable_moments"
  ],
  "conversation_type": "rabbit_hole",
  "brief_explanation": "One sentence explaining the scores",
  "conversation_summary": "Started with [X], evolved through [Y], ended at [Z]"
}
\`\`\`

**CONVERSATION TO ANALYZE:**
${conversationText}`;
  }

  private formatConversationForAnalysis(conversation: ComprehensiveConversation): string {
    const topic = `INITIAL TOPIC: ${conversation.conversation.topic}`;
    
    const turns = conversation.turns.map((turn, index) => {
      return `Turn ${index + 1} (${turn.speaker.toUpperCase()}): ${turn.output}`;
    }).join('\n\n');

    return `${topic}\n\n${turns}`;
  }

  private parseAnalysisResponse(analysisText: string): ConversationAnalysis {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
      
      const parsed = JSON.parse(jsonText);
      
      // Add metadata
      return {
        ...parsed,
        analysis_timestamp: new Date().toISOString(),
        analysis_model: this.model
      };
    } catch (error) {
      throw new Error(`Failed to parse analysis response: ${error}`);
    }
  }
}
```

### Phase 3: Integration with Main Pipeline (30 mins)

#### 3.1 Update conversation.ts
Modify the main conversation flow to include analysis:

```typescript
// Add imports at top
import { AnalysisService } from './analysis-service';
import { AnalyzedConversation, ConversationAnalysis } from './types';

// After the conversation loop completes and JSON is created:
async function analyzeAndUpload(
  conversationData: ComprehensiveConversation,
  config: any,
  logger: Logger,
  sessionId: string,
  uploadOverride?: boolean
): Promise<{ analysis: ConversationAnalysis | null; uploadResult: any }> {
  
  let analysis: ConversationAnalysis | null = null;
  
  // Run analysis if enabled
  if (config.ANALYSIS_ENABLED === 'true' && config.OPENAI_API_KEY) {
    try {
      logger.log('INFO', 'Running semantic analysis...');
      const analysisService = new AnalysisService(config.OPENAI_API_KEY, config.ANALYSIS_MODEL, logger);
      analysis = await analysisService.analyzeConversation(conversationData);
      
      // Log analysis results
      logger.log('INFO', `Analysis: ${analysis.brief_explanation}`);
      logger.log('INFO', `Hook strength: ${analysis.hook_strength}/10`);
      
    } catch (error) {
      logger.log('ERROR', `Analysis failed: ${error}`);
      // Continue without analysis
    }
  }

  // Create analyzed conversation object
  const finalConversation: AnalyzedConversation = {
    ...conversationData,
    ...(analysis && { analysis })
  };

  // Handle upload
  let uploadResult = null;
  const shouldUpload = uploadOverride !== undefined ? uploadOverride : config.AUTO_UPLOAD === 'true';
  
  if (shouldUpload && config.UPLOAD_ENABLED === 'true') {
    try {
      logger.log('INFO', 'Attempting to upload conversation...');
      const uploadService = createUploadService(config);
      uploadResult = await uploadService.uploadConversation(finalConversation, sessionId);
      
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

  return { analysis, uploadResult };
}

// In main() function, replace the upload section with:
const { analysis, uploadResult } = await analyzeAndUpload(
  conversationData, 
  config, 
  logger, 
  sessionId, 
  uploadOverride
);

// Update summary output to include analysis info
if (analysis) {
  console.log(`\n🧠 Analysis Results:`);
  console.log(`  📊 Hook Strength: ${analysis.hook_strength}/10`);
  console.log(`  🎯 Type: ${analysis.conversation_type}`);
  console.log(`  💭 ${analysis.brief_explanation}`);
  
  if (analysis.hook_strength >= parseInt(config.ANALYSIS_FEATURE_THRESHOLD || '8')) {
    console.log(`  ⭐ HIGH POTENTIAL - Consider featuring this conversation!`);
  }
}
```

### Phase 4: Configuration & Testing (15 mins)

#### 4.1 Update config.env.example
```bash
# Analysis Settings (Optional)
ANALYSIS_ENABLED=true
ANALYSIS_MODEL=gpt-4o-mini
ANALYSIS_HOOK_THRESHOLD=6
ANALYSIS_FEATURE_THRESHOLD=8
```

#### 4.2 Update your actual config.env
Add the analysis settings with your OpenAI API key.

#### 4.3 Test the integration
```bash
npm run build
npm run dev "pizza delivery optimization" 15
```

### Phase 5: Batch Analysis Script (Optional - 20 mins)

#### 5.1 Create scripts/analyze-existing.ts
For analyzing conversations already generated:

```typescript
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
  const analysisService = new AnalysisService(config.OPENAI_API_KEY, config.ANALYSIS_MODEL, logger);

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
```

Add to package.json scripts:
```json
{
  "scripts": {
    "analyze-existing": "tsx scripts/analyze-existing.ts"
  }
}
```

## File Changes Summary

### New Files:
- `src/analysis-service.ts` - Core analysis functionality
- `scripts/analyze-existing.ts` - Batch analysis for existing conversations

### Modified Files:
- `src/types.ts` - Add analysis interfaces
- `src/conversation.ts` - Integrate analysis into pipeline  
- `package.json` - Add OpenAI dependency
- `config.env` - Add analysis configuration

## Usage Examples

### Generate with analysis:
```bash
npm run dev "coffee shop efficiency" 20
```

Output will include analysis scores and recommendations.

### Analyze existing conversations:
```bash
npm run analyze-existing
```

## Configuration Options

- `ANALYSIS_ENABLED=true/false` - Enable/disable analysis
- `ANALYSIS_MODEL=gpt-4o-mini` - Model for analysis (cheaper option)
- `ANALYSIS_HOOK_THRESHOLD=6` - Minimum hook score to consider "good"
- `ANALYSIS_FEATURE_THRESHOLD=8` - Minimum hook score to feature prominently

## Expected Cost Impact

- Analysis adds ~$0.01-0.02 per conversation (using gpt-4o-mini)
- Batch analysis of 100 existing conversations: ~$1-2
- Minimal compared to conversation generation costs

## Success Criteria

✅ Analysis runs automatically after each conversation  
✅ Structured scores help identify entertaining conversations  
✅ Batch processing works for existing conversations  
✅ Upload includes analysis metadata  
✅ Clear indicators when conversations have high viral potential  

The analysis will help you identify the gems in your generated conversations and provide rich metadata for building an entertaining conversation browsing experience!
