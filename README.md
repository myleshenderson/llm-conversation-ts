# LLM Conversation TypeScript

A modern TypeScript system that enables two different Large Language Models (OpenAI GPT and Anthropic Claude) to have conversations with each other. Built with type safety, comprehensive logging, and rich data export capabilities.

## Features

- **Full TypeScript implementation**: Type-safe conversation management with comprehensive interfaces
- **Two-way LLM conversations**: OpenAI GPT and Anthropic Claude exchange messages with full context
- **Conversation history**: Maintains complete conversation context across all turns
- **Comprehensive logging**: Detailed logs with timestamps and turn tracking
- **JSON export**: Rich conversation data perfect for web applications and analysis
- **Modern tooling**: Built with TypeScript, uses modern async/await patterns
- **Minimal dependencies**: Only essential dependencies included
- **Session management**: Each conversation gets a unique session ID with metadata

## Requirements

- **Node.js** (version 18.0.0 or higher)
- **npm** or **yarn** package manager
- API keys for OpenAI and/or Anthropic

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure API Keys

1. Copy the example configuration file:
   ```bash
   cp config.env.example config.env
   ```

2. Edit `config.env` and add your API keys:
   ```bash
   # Required: Add your actual API keys
   OPENAI_API_KEY="sk-your-actual-openai-key-here"
   ANTHROPIC_API_KEY="sk-ant-your-actual-anthropic-key-here"
   
   # Optional: Customize models and settings
   OPENAI_MODEL="gpt-4"
   ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
   CONVERSATION_TOPIC="Discuss the future of artificial intelligence"
   MAX_TURNS="10"
   ```

### 3. Build the Project

```bash
npm run build
```

## Usage

### Development Mode (Recommended)

Use TypeScript directly with tsx for development:

```bash
# Start conversation with custom topic
npx tsx src/start-conversation.ts "Discuss the ethics of AI in healthcare"

# Start conversation with custom topic and turn count
npx tsx src/start-conversation.ts "Analyze renewable energy" 8

# See example topics for inspiration
npx tsx src/start-conversation.ts --examples

# Start with a random topic and custom turns
npx tsx src/start-conversation.ts --random 12

# Show help
npx tsx src/start-conversation.ts --help
```

### Production Mode

Build and run the compiled JavaScript:

```bash
npm run build
node dist/start-conversation.js "Your conversation topic" 10
```

### Direct Conversation Orchestrator

Run the conversation orchestrator directly:

```bash
# Development
npx tsx src/conversation.ts "Your topic here" 10

# Production
npm run build
node dist/conversation.js "Your topic here" 10
```

## Project Structure

```
llm-conversation-ts/
├── src/
│   ├── types.ts                 # TypeScript interfaces and types
│   ├── config.ts                # Configuration loader
│   ├── logger.ts                # Logging utility
│   ├── history.ts               # Conversation history manager
│   ├── openai-handler.ts        # OpenAI API handler
│   ├── anthropic-handler.ts     # Anthropic API handler
│   ├── conversation.ts          # Main conversation orchestrator
│   └── start-conversation.ts    # CLI wrapper with examples
├── logs/                        # Generated conversation logs and JSON
├── dist/                        # Compiled JavaScript (after build)
├── package.json                 # Node.js dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── config.env.example         # Configuration template
├── config.env                 # Your actual configuration (create this)
└── README.md                  # This file
```

## TypeScript Features

### Type Safety

All conversation data is fully typed:

```typescript
interface ConversationMetadata {
  session_id: string;
  created_at: string;
  completed_at: string;
  duration_seconds: number;
  status: 'completed' | 'failed' | 'in_progress';
  version: string;
  features: string[];
}

interface TurnMetadata {
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
```

### Modern Async/Await

Clean, modern JavaScript patterns:

```typescript
async processMessage(message: string, sessionId: string, turnNumber: number): Promise<AIHandlerResult> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  
  const responseData = await response.json();
  return { response: aiResponse, metadata };
}
```

### Comprehensive Error Handling

Type-safe error handling throughout:

```typescript
try {
  const result = await openaiHandler.processMessage(message, sessionId, turnNumber);
  return result;
} catch (error) {
  this.logger.log('ERROR', `Failed to process request: ${error}`);
  throw error;
}
```

## JSON Data Structure

The system produces rich JSON exports with complete type safety:

```json
{
  "metadata": {
    "session_id": "conversation_20250531_150632_discuss_ai_ethics",
    "created_at": "2025-05-31T19:06:32.123Z",
    "completed_at": "2025-05-31T19:06:49.456Z",
    "duration_seconds": 17,
    "status": "completed",
    "version": "2.0",
    "features": ["conversation_history", "context_aware", "typescript_native"]
  },
  "conversation": {
    "topic": "Discuss the ethics of AI in healthcare",
    "max_turns": 4,
    "actual_turns": 4
  },
  "models": {
    "openai": {
      "model": "gpt-4",
      "api_base": "https://api.openai.com/v1"
    },
    "anthropic": {
      "model": "claude-3-5-sonnet-20241022",
      "api_base": "https://api.anthropic.com/v1"
    }
  },
  "statistics": {
    "total_tokens": 915,
    "openai_tokens": 403,
    "anthropic_tokens": 512,
    "average_response_time_ms": 2149
  },
  "turns": [
    // ... detailed turn data
  ]
}
```

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run in development mode with tsx
- `npm start` - Run compiled JavaScript
- `npm run clean` - Remove compiled files
- `npm run type-check` - Check types without compiling

## Development

### Adding New Features

The TypeScript architecture makes it easy to extend:

1. **Add new types** in `src/types.ts`
2. **Create new handlers** by extending the existing pattern
3. **Update interfaces** to maintain type safety
4. **Add tests** (testing framework can be added as needed)

### Custom AI Providers

To add new AI providers:

1. Create a new handler file (e.g., `src/gemini-handler.ts`)
2. Implement the `AIHandlerResult` interface
3. Add provider-specific types to `types.ts`
4. Update the conversation orchestrator

## API Costs

Be aware that each conversation will make multiple API calls:
- OpenAI GPT-4: ~$0.03 per 1K tokens
- Anthropic Claude: ~$0.015 per 1K tokens

A typical 10-turn conversation might cost $0.10-$0.50 depending on response lengths.

## Architecture

This project is built with modern TypeScript best practices:
- **Type safety and maintainability**: Comprehensive type definitions prevent runtime errors
- **Modern JavaScript/TypeScript patterns**: Uses latest ES2022 features and async/await
- **Minimal dependencies**: Only essential packages to reduce bloat and security surface
- **Clean, readable code**: Well-structured modules with clear separation of concerns
- **Extensible design**: Easy to add new AI providers or conversation formats

## License

MIT License - feel free to use and modify as needed.
