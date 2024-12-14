# Okos - AI Telegram Assistant

A Telegram chatbot powered by Ollama's Llama model, featuring conversation memory and intelligent summarization.

## Features

- Conversational AI using Llama model
- Persistent conversation memory using Redis
- Intelligent conversation summarization
- Telegram integration with typing indicators
- Optional LangSmith integration for monitoring and debugging

## Prerequisites

- Node.js 18+
- Redis server
- Ollama with Llama model installed
- Telegram Bot Token

## Setup

1. Install dependencies:

```bash
yarn install
```

2. Configure environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your:

- Telegram Bot Token
- Ollama API URL
- Redis URL
- (Optional) LangSmith credentials for monitoring

3. Start Redis:

```bash
redis-server
```

4. Start Ollama with Llama model:

```bash
ollama run llama3.1
```

5. Build the bot:

```bash
yarn build
```

6. Start the bot:

```bash
yarn start
```

7. For Development:

```bash
yarn dev
```

## Environment Variables

Required:

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `OLLAMA_API_URL`: URL for Ollama API (default: http://localhost:11434)
- `MODEL_NAME`: Name of the Ollama model to use (default: llama3.1)
- `REDIS_URL`: Redis connection URL (default: redis://localhost:6379)

Optional LangSmith Integration:

- `LANGCHAIN_TRACING_V2`: Enable LangSmith tracing
- `LANGCHAIN_ENDPOINT`: LangSmith API endpoint
- `LANGCHAIN_API_KEY`: Your LangSmith API key
- `LANGCHAIN_PROJECT`: Project name in LangSmith

## Architecture

The bot uses:

- LangGraph for conversation flow management
- Redis for persistent state and message history
- Ollama's Llama model for AI responses
- TypeScript for type safety
- Optional LangSmith for monitoring and debugging

## License

MIT
