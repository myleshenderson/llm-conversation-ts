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