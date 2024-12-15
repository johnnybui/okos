# Okos - AI Telegram Assistant

[![Build](https://github.com/johnnybui/okos/actions/workflows/build.yml/badge.svg)](https://github.com/johnnybui/okos/actions/workflows/build.yml)

Okos is a Telegram AI Assistant built with TypeScript, LangGraph, and multiple AI model providers. It maintains conversation context and provides summaries of interactions.

## Features

- Multiple AI model support (OpenAI, Google Gemini, Groq, Ollama)
- Conversation context management
- Automatic conversation summarization
- Image input support
- Redis for state persistence
- Docker support for both local and cloud deployments

## Prerequisites

- Node.js 20+ (for development only)
- Docker and Docker Compose (for containerized deployment)
- Telegram Bot Token from [BotFather](https://t.me/botfather)
- API keys for chosen AI providers
- Redis server
- Ollama with Llama model installed (for Ollama model provider)

## Setup

1. Clone the repository
2. Install dependencies:

```bash
yarn install
```

3. Copy the example environment file:

```bash
# For local development
cp .env.example .env

# For Docker deployment
cp .env.docker.example .env.docker
```

4. Configure environment variables in `.env` or `.env.docker`:

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `MODEL_PROVIDER`: Choose from 'ollama', 'google', 'groq', or 'openai'
- Provider-specific API keys and model names
- Redis URL
- (Optional) LangSmith credentials for monitoring

## Running Locally

Development mode with hot reload:

```bash
yarn dev
```

Production mode:

```bash
yarn build
yarn start
```

## Docker Deployment

Two deployment options are available:

### 1. Local Deployment with Ollama

Includes Ollama for local LLM inference:

```bash
# Build containers
yarn build:ollama

# Start services
yarn start:ollama
```

### 2. Cloud Deployment

Uses cloud AI providers (OpenAI, Google, or Groq):

```bash
# Build containers
yarn build:cloud

# Start services
yarn start:cloud
```

## Environment Variables

### Required

- `TELEGRAM_BOT_TOKEN`: Telegram Bot token
- `MODEL_PROVIDER`: AI model provider ('ollama', 'google', 'groq', or 'openai')
- `REDIS_URL`: Redis connection URL

### Provider-Specific

- OpenAI:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL_NAME` (default: gpt-4o-mini)
- Google:
  - `GOOGLE_API_KEY`
  - `GOOGLE_MODEL_NAME` (default: gemini-1.5-flash)
- Groq:
  - `GROQ_API_KEY`
  - `GROQ_MODEL_NAME` (default: llama-3.3-70b-versatile)
- Ollama:
  - `OLLAMA_API_URL`
  - `OLLAMA_MODEL_NAME` (default: llama3.2)

### Optional

- `LANGCHAIN_TRACING_V2`: Enable LangSmith tracing
- `LANGCHAIN_ENDPOINT`: LangSmith endpoint
- `LANGCHAIN_API_KEY`: LangSmith API key
- `LANGCHAIN_PROJECT`: LangSmith project name

## License

MIT
