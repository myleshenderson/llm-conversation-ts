# LLM Conversation TypeScript

A modern TypeScript system that enables two different Large Language Models (OpenAI GPT and Anthropic Claude) to have conversations with each other. Built with type safety, comprehensive logging, and rich data export capabilities.

## Features

- **Full TypeScript implementation**: Type-safe conversation management with comprehensive interfaces
- **Configurable LLM providers**: Choose which provider (OpenAI/Anthropic) to use for LLM1 and LLM2
- **Two-way LLM conversations**: Any combination of OpenAI GPT and Anthropic Claude can exchange messages
- **Conversation history**: Maintains complete conversation context across all turns
- **Comprehensive logging**: Detailed logs with timestamps and turn tracking
- **JSON export**: Rich conversation data perfect for web applications and analysis
- **🌐 Upload & Share**: Upload conversations to visualizer platform with direct viewer URLs
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
   # LLM Provider Selection
   # Choose which provider to use for each LLM (openai or anthropic)
   LLM1_PROVIDER="openai"
   LLM2_PROVIDER="anthropic"
   
   # OpenAI Configuration
   OPENAI_API_KEY="sk-your-actual-openai-key-here"
   OPENAI_MODEL="gpt-4"
   OPENAI_BASE_URL="https://api.openai.com/v1"
   
   # Anthropic Configuration
   ANTHROPIC_API_KEY="sk-ant-your-actual-anthropic-key-here"
   ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
   ANTHROPIC_BASE_URL="https://api.anthropic.com/v1"
   
   # Conversation Settings
   CONVERSATION_TOPIC="Discuss the future of artificial intelligence"
   MAX_TURNS="10"
   DELAY_BETWEEN_MESSAGES="2"
   
   # Upload Settings (Optional)
   UPLOAD_ENABLED=true
   UPLOAD_API_URL=https://uxx6unuo0e.execute-api.us-east-1.amazonaws.com/prod/upload
   AUTO_UPLOAD=false
   UPLOAD_MAX_RETRIES=3
   UPLOAD_RETRY_DELAY=1000
   ```
   
   **Note**: You can now configure which provider (OpenAI or Anthropic) to use for LLM1 and LLM2. For example:
   - Set both to "anthropic" to have two Claude models talk
   - Set both to "openai" to have two GPT models talk
   - Mix and match as desired
   
   **NEW**: You can also specify different models within the same provider:
   ```bash
   # Use different GPT models
   LLM1_PROVIDER="openai"
   LLM1_MODEL="gpt-4"
   LLM2_PROVIDER="openai"
   LLM2_MODEL="gpt-3.5-turbo"
   
   # Use different Claude models
   LLM1_PROVIDER="anthropic"
   LLM1_MODEL="claude-3-5-sonnet-20241022"
   LLM2_PROVIDER="anthropic"
   LLM2_MODEL="claude-3-haiku-20240307"
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

# Generate and upload conversation automatically
npx tsx src/start-conversation.ts "Future of AI" 10 --upload

# Test upload configuration
npx tsx src/start-conversation.ts --test-upload

# Upload existing conversation file
npx tsx src/start-conversation.ts --upload-file logs/conversation_123.json

# See example topics for inspiration
npx tsx src/start-conversation.ts --examples

# Start with a random topic and custom turns
npx tsx src/start-conversation.ts --random 12

# Show help
npx tsx src/start-conversation.ts --help
```

### Upload & Share Conversations

Upload conversations to the visualizer platform for easy sharing:

```bash
# Upload all existing conversations
npx tsx src/upload-existing.ts --all

# Upload recent conversations only
npx tsx src/upload-existing.ts --recent 5

# Test your upload configuration
npx tsx src/start-conversation.ts --config
```

**Generated URLs**: Uploaded conversations get viewer URLs like:
`https://modelstogether.com/conversation/2025-06-04T00-28-13-235Z_ai-discussion.json`

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
│   ├── upload-service.ts        # Upload functionality with retry logic
│   ├── upload-existing.ts       # Batch upload utility for existing files
│   ├── conversation.ts          # Main conversation orchestrator
│   └── start-conversation.ts    # CLI wrapper with examples
├── logs/                        # Generated conversation logs and JSON
├── dist/                        # Compiled JavaScript (after build)
├── package.json                 # Node.js dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── config.env.example         # Configuration template
├── config.env                 # Your actual configuration (create this)
├── UPLOAD.md                  # Upload feature documentation
└── README.md                  # This file
```

## 🌐 Upload & Share Feature

Transform your local conversations into shareable online experiences! The upload feature enables seamless integration with the visualizer platform at `https://modelstogether.com`.

### Quick Start
```bash
# Generate and upload a conversation
npx tsx src/start-conversation.ts "AI Ethics Discussion" 10 --upload

# Upload existing conversations
npx tsx src/upload-existing.ts --all
```

### Features
- **Instant Sharing**: Get direct viewer URLs for immediate sharing
- **Batch Upload**: Upload multiple existing conversations at once
- **Robust Reliability**: Built-in retry logic and error handling
- **Flexible Control**: Upload on-demand or automatically

**For complete upload documentation, see [UPLOAD.md](UPLOAD.md)**

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
