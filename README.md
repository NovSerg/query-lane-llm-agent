# QueryLane

> **query-lane-llm-agent** - Fast AI chat application with Z.AI (GLM models) integration

Your fast lane from question to answer. A modern, responsive web chat interface for interacting with Z.AI's GLM language models with streaming responses, multiple model selection, and persistent chat history.

## Features

- 🤖 **Multiple AI Models** - Support for GLM-4.6, GLM-4.5, GLM-4.5-Flash, and more
- 🚀 **Streaming Responses** - Real-time token-by-token message streaming
- 💾 **Persistent History** - Auto-save conversations to localStorage
- 🎨 **Dark/Light Theme** - Theme toggle with system preference detection
- 📱 **Fully Responsive** - Mobile-first design with adaptive UI
- ⚡ **Rate Limiting** - Built-in protection against abuse
- 🔄 **Abort Control** - Stop generation at any time
- 📋 **Copy & Clear** - Easy message management

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your ZAI_API_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Get your Z.AI API key at [https://open.bigmodel.cn/](https://open.bigmodel.cn/)

```env
ZAI_API_KEY=your_api_key_here
RATE_LIMIT_RPM=30
MAX_INPUT_CHARS=10000
```

## Available Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run start` - Production server
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + TypeScript 5
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Validation**: Zod schemas
- **Testing**: Vitest
- **AI Provider**: Z.AI (Zhipu AI) - GLM models

## Project Structure

```
query-lane-llm-agent/
├── app/                  # Next.js App Router
│   ├── api/chat/        # Chat API endpoint
│   └── page.tsx         # Main chat interface
├── components/          # React components
│   ├── ui/             # shadcn/ui primitives
│   ├── ModelSelector.tsx
│   ├── MessageList.tsx
│   └── Composer.tsx
├── lib/                # Client utilities
│   ├── ndjson-client.ts
│   └── storage.ts
└── server/             # Server-side code
    ├── provider/       # AI provider adapters
    └── schema.ts       # Zod validation schemas
```

## License

MIT © Sergey Novachenko
