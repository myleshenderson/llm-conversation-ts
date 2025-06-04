export interface Config {
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  OPENAI_MODEL: string;
  ANTHROPIC_MODEL: string;
  OPENAI_BASE_URL: string;
  ANTHROPIC_BASE_URL: string;
  CONVERSATION_TOPIC: string;
  MAX_TURNS: string;
  DELAY_BETWEEN_MESSAGES: string;
  LOG_LEVEL?: string;
  // Upload Settings
  UPLOAD_ENABLED?: string;
  UPLOAD_API_URL?: string;
  AUTO_UPLOAD?: string;
  UPLOAD_MAX_RETRIES?: string;
  UPLOAD_RETRY_DELAY?: string;
  // Analysis Settings
  ANALYSIS_ENABLED?: string;
  ANALYSIS_MODEL?: string;
  ANALYSIS_HOOK_THRESHOLD?: string;
  ANALYSIS_FEATURE_THRESHOLD?: string;
}

export interface ConversationMessage {
  role?: 'user' | 'assistant' | 'system';
  content: string;
  speaker?: 'openai' | 'anthropic';
}

export interface ConversationHistory {
  conversation_topic: string;
  messages: ConversationMessage[];
}

export interface TokenUsage {
  total: number;
  prompt?: number;
  completion?: number;
  input?: number;
  output?: number;
}

export interface TurnMetadata {
  turn: number;
  speaker: 'openai' | 'anthropic';
  model: string;
  timestamp: string;
  input: string;
  output: string;
  response_time_ms: number;
  tokens: TokenUsage;
  raw_response: any;
}

export interface ConversationMetadata {
  session_id: string;
  created_at: string;
  completed_at: string;
  duration_seconds: number;
  status: 'completed' | 'failed' | 'in_progress';
  version: string;
  features: string[];
}

export interface ConversationStatistics {
  total_tokens: number;
  openai_tokens: number;
  anthropic_tokens: number;
  average_response_time_ms: number;
}

export interface ModelInfo {
  model: string;
  api_base: string;
}

export interface ConversationData {
  topic: string;
  max_turns: number;
  actual_turns: number;
}

export interface ComprehensiveConversation {
  metadata: ConversationMetadata;
  conversation: ConversationData;
  models: {
    openai: ModelInfo;
    anthropic: ModelInfo;
  };
  statistics: ConversationStatistics;
  turns: TurnMetadata[];
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
  model: string;
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicResponse {
  content: Array<{
    text: string;
  }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'ERROR' | 'INPUT' | 'OUTPUT' | 'METADATA';

export interface AIHandlerResult {
  response: string;
  metadata: TurnMetadata;
}

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
