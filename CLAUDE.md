# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QueryLane is a Next.js 16-based AI chat application with streaming responses, supporting both Z.AI (Zhipu AI) GLM models and OpenRouter models (including Claude). The app features an agent-based architecture where users can create and manage AI assistants with custom configurations.

## Development Commands

### Running the Application
- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Create production build
- `npm start` - Run production server

### Code Quality
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting without changes

### Testing
- `npm test` - Run Vitest unit tests (uses jsdom environment)
- `npm run test:ui` - Run tests with Vitest UI
- `npm run test:e2e` - Run Playwright e2e tests (if configured)

### Environment Setup
Copy `.env.example` to `.env.local` and configure:
- `ZAI_API_KEY` - Required for GLM models (get at https://open.bigmodel.cn/)
- `OPENROUTER_API_KEY` - Required for GPT-4, Claude and other OpenRouter models (get at https://openrouter.ai/)
- `RATE_LIMIT_RPM` - Requests per minute limit (default: 30)
- `MAX_INPUT_CHARS` - Max input characters (default: 10000)

## Architecture

### Request Flow

1. **Client** (`app/page.tsx`) → User sends message
2. **NDJSON Client** (`lib/ndjson-client.ts`) → Sends request to API with agent configuration
3. **API Route** (`app/api/chat/route.ts`) → Validates, rate-limits, routes to provider
4. **Provider Adapter** (`server/provider/`) → Streams response from AI provider
5. **Client Processing** → Parses format (JSON/XML/custom), saves to history

### Provider System

The app uses a **provider adapter pattern** to support multiple AI providers:

- **Factory**: `server/provider/index.ts` - `createProvider()` determines provider from model ID
  - Models containing "claude", "anthropic", "openai", or "/" → OpenRouter
  - All other models → Z.AI

- **Adapters**:
  - `server/provider/zai.ts` - Z.AI (GLM models) via their streaming API
  - `server/provider/openrouter.ts` - OpenRouter (GPT-4, Claude, etc.) via their API

- **Supported Models**:
  - OpenAI: GPT-4.1, GPT-4o, GPT-4o-mini
  - Anthropic: Claude Haiku 4.5, Claude Sonnet 4, Claude Opus 4
  - Z.AI: GLM-4.6, GLM-4.5 (various variants)

All providers implement the `ProviderAdapter` interface with `generateStream()` method that yields `StreamChunk` objects.

### Agent System

**Agents** (`lib/types.ts:Agent`) are complete AI assistant configurations containing:
- Model selection and provider
- System prompt
- LLM parameters (temperature, max_tokens, top_p, etc.)
- Output format configuration (text/JSON/XML/custom)

**Storage**: `lib/agent-storage.ts`
- Five default agents:
  - 🔬 Лаборатория температур (experimental agent for testing temperature settings)
  - ⚡ Прямой ответ, 🧩 Пошаговое рассуждение, 🎯 Мета-промптинг, 👥 Экспертная панель (reasoning modes)
- Persisted in localStorage with key `querylane.agents.v1`
- Active agent stored in `querylane.active-agent.v1`
- Supports CRUD operations, export/import, search, duplicate

**Reasoning Modes** (`lib/reasoning-modes.ts`):
The app includes 4 advanced reasoning strategies based on prompt engineering techniques:

1. **Direct Answer** (⚡): Fast, concise responses without detailed analysis
   - Use for: Quick questions, simple lookups
   - Temperature: 0.7, Tokens: 2000

2. **Chain-of-Thought** (🧩): Step-by-step reasoning with explanations
   - Use for: Math problems, logical puzzles, complex analysis
   - Improves accuracy on multi-step tasks
   - Temperature: 0.5, Tokens: 4000

3. **Meta-Prompting** (🎯): First creates optimal strategy, then solves
   - Use for: Unclear problems, tasks requiring specific approach
   - Analyzes task type and selects best methodology
   - Temperature: 0.6, Tokens: 4000

4. **Expert Panel** (👥): Multiple virtual experts discuss solution
   - Use for: Complex decisions, multi-faceted problems
   - Includes: Practitioner, Analyst, Creative Thinker, Critic
   - Temperature: 0.7, Tokens: 5000

### Chat Management

**Chat Storage**: `lib/chat-storage.ts`
- Multi-chat support with automatic title generation from first user message
- Persisted in localStorage with key `querylane.chats`
- Current chat ID in `querylane.currentChatId`
- Messages include optional metadata for parsed responses

### Response Format System

The app supports structured output formats with validation:

- **Formats**: text (default), json, xml, custom
- **Validation modes**: strict, lenient, fallback
- **Parsers**:
  - `lib/json-parser.ts` - JSON extraction and validation
  - `lib/xml-parser.ts` - XML parsing
  - Custom format handling via system prompts

**Format Config** (`lib/types.ts:FormatConfig`):
- `format` - Output format type
- `systemPrompt` - Instructions for the model on how to format
- `exampleFormat` - Example output (optional)
- `validationMode` - How strict to validate

### NDJSON Streaming

The API streams responses using **newline-delimited JSON** (NDJSON):

**Stream Chunks** (`lib/types.ts:StreamChunk`):
- `meta` - Stream metadata (model info, start time)
- `token` - Content chunk
- `done` - Stream complete
- `error` - Error occurred

Client-side processing in `lib/ndjson-client.ts` with callbacks for each chunk type.

### Rate Limiting

In-memory rate limiting (`app/api/chat/route.ts`):
- Uses Map with IP → `{count, resetTime}`
- Configurable via `RATE_LIMIT_RPM` env var
- Periodic cleanup of expired entries
- Returns 429 status when exceeded

### Component Architecture

**Main Page** (`app/page.tsx`):
- Client component with state management
- Hydration-safe initialization (checks `mounted` state)
- Theme persistence in localStorage
- Manages chat state: idle, connecting, streaming, stopped, error

**Key Components**:
- `AgentManager` - Agent selection and configuration UI
- `ChatHistory` - Multi-chat navigation
- `MessageList` - Renders messages with markdown support
- `Composer` - Message input with textarea
- `StructuredResponseViewer` - Displays parsed JSON/XML responses
- `ThemeProvider` - Dark/light mode with MUI integration

**UI Library**: Hybrid approach
- MUI (Material-UI) for icons and theme
- shadcn/ui components in `components/ui/` (Radix UI + Tailwind)
- Tailwind CSS v4 for styling

### Type System

Central type definitions in `lib/types.ts`:
- `Message` - Chat message with role and optional metadata
- `Agent` - Complete assistant configuration
- `FormatConfig` - Output format settings
- `LLMParameters` - Model parameters (temperature, top_p, etc.)
- `ProviderAdapter` - Interface for AI providers
- `StreamChunk` - NDJSON stream chunk types

### Validation

**Zod schemas** in `server/schema.ts`:
- `ChatRequestSchema` - Validates API requests
- `MessageSchema` - Validates individual messages
- `FormatConfigSchema` - Validates format configuration
- `LLMParametersSchema` - Validates model parameters
- Max 50 messages per request
- Input length validation via `validateInputLength()`

## Important Patterns

### SSR Safety
Many utilities check `typeof window === 'undefined'` to prevent SSR errors. The main page uses `mounted` state to prevent hydration mismatches.

### localStorage Keys Convention
All localStorage keys use `querylane.` prefix:
- `querylane.chats` - Chat history
- `querylane.currentChatId` - Active chat
- `querylane.agents.v1` - Agent configurations
- `querylane.active-agent.v1` - Active agent ID
- `querylane.theme` - Dark/light mode preference

### Error Handling
Errors in streams are handled via error chunks, not thrown exceptions. The API always returns NDJSON, even for errors.

### Response History
Successful parsed responses are saved to `responseHistory` (`lib/response-history.ts`) with the prompt, parsed data, template/agent info, and model used.

## Tech Stack Details

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4, MUI 7
- **Validation**: Zod 4
- **Testing**: Vitest 4 (unit), Playwright (e2e)
- **Markdown**: react-markdown with remark-gfm and rehype-highlight
- **AI Providers**: Z.AI (Zhipu AI GLM), OpenRouter

## External Memory System

QueryLane supports persistent external memory stored in `data/memory.json` on the server. This provides long-term storage across server restarts and enables semantic search via vector embeddings.

### Architecture

- **Storage**: JSON file with atomic writes (`server/memory/memory-storage.ts`)
- **Embeddings**: Xenova/all-MiniLM-L6-v2 model (384 dimensions)
- **Search**: Cosine similarity-based semantic search

### API Endpoints

- `POST /api/memory/chats` - Create chat
- `GET /api/memory/chats` - List chats
- `GET /api/memory/chats/[id]` - Get chat
- `PUT /api/memory/chats/[id]` - Update chat
- `DELETE /api/memory/chats/[id]` - Delete chat
- `POST /api/memory/embeddings` - Generate embeddings (single/batch)
- `POST /api/memory/search` - Semantic search
- `GET /api/memory/stats` - Storage statistics

### Client Usage

```typescript
import { externalMemory } from '@/lib/external-memory';

// Create chat
const chat = await externalMemory.createChat('Title', 'agent_id', messages);

// Search
const results = await externalMemory.search('query', { limit: 5 });
```

### Data Structure

```
data/
├── memory.json         # Main storage (chats, agents, embeddings)
└── memory.backup.json  # Auto-backup (every 100 operations)
```

### Features

- ✅ Atomic writes (corruption-safe)
- ✅ Auto-backups
- ✅ In-memory caching (5 min TTL)
- ✅ Debounced saves (500ms)
- ✅ Vector embeddings for semantic search
- ✅ Batch embedding generation

See `EXTERNAL_MEMORY_GUIDE.md` for detailed usage and testing instructions.

## Notes

- The app supports both localStorage (client) and external memory (server)
- External memory persists across server restarts
- Streaming is critical to UX - don't break NDJSON format
- Agent system is the core abstraction - preserve the complete configuration approach
- Format system allows structured outputs - validate thoroughly when parsing
