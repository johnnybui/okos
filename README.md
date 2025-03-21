# Okos - AI Telegram Assistant

[![Build](https://github.com/johnnybui/okos/actions/workflows/build.yml/badge.svg)](https://github.com/johnnybui/okos/actions/workflows/build.yml)

Okos is a Telegram AI Assistant built with TypeScript, LangGraph, and multiple AI model providers. It maintains conversation context and provides summaries of interactions. Version 2 (current) uses native tool capabilities of modern LLMs for enhanced performance.

## Features

- Multiple AI model support (OpenAI, Google Gemini, Groq, Ollama)
- Native tool use for enhanced performance and reliability
- Conversation context management
- Automatic conversation summarization
- Multiple Images input support
- Internet searching
- Weather information retrieval (current conditions and 5-day forecasts)
- Complete reminder system with tools to set, list, and delete notifications at specified times
- Message queuing system with BullMQ to prevent overlapping workflows
- Redis for state persistence and job queuing
- User authentication system with token-based access control
- Docker support for both local and cloud deployments

## Prerequisites

- Bun 1.2 (for development only)
- Docker and Docker Compose (for containerized deployment)
- Telegram Bot Token from [BotFather](https://t.me/botfather)
- API keys for chosen AI providers
- Redis server
- Ollama with Llama model installed (for Ollama model provider)
- **Important:** For chat models, you must use models with native tool-calling capabilities (e.g., GPT-4o, Gemini-2.0-flash)

## Prebuilt Docker Image

```
ghcr.io/johnnybui/okos
```

Platforms: `amd64` and `arm64`

## Setup

1. Clone the repository
2. Install dependencies:

```bash
bun install
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
- `OKOS_TOKEN`: Access token for user authentication
- `OKOS_ADMIN_USERNAME`: Telegram username of the admin user
- `MODEL_PROVIDER`: Choose from 'ollama', 'google', 'groq', or 'openai'
- Provider-specific API keys and model names
- Redis URL
- (Optional) LangSmith credentials for monitoring

## Running Locally

Development mode with hot reload:

```bash
bun dev
```

Production mode:

```bash
bun run build
bun start
```

## Docker Deployment

You can deploy using one of two options:

### 1. Local Deployment with Ollama

For local LLM inference:

1. **Build Containers** (optional):  
   Use the command below to build the containers. Alternatively, to use a prebuilt image, edit the `docker-compose` file, replacing the `build: .` line with:
   ```yaml
   image: ghcr.io/johnnybui/okos
   ```
   Run build:
   ```bash
   bun build:ollama
   ```
2. **Start Services**:
   ```bash
   bun up:ollama
   ```

### 2. Cloud Deployment

For cloud-based AI providers (OpenAI, Google, Groq):

1. **Build Containers** (optional):  
   Similar to local deployment, replace `build: .` in the `docker-compose` file with the prebuilt image if desired:
   ```yaml
   image: ghcr.io/johnnybui/okos
   ```
   Run build:
   ```bash
   bun build:cloud
   ```
2. **Start Services**:
   ```bash
   bun up:cloud
   ```

## Environment Variables

### Required

- `TELEGRAM_BOT_TOKEN`: Telegram Bot token
- `OKOS_TOKEN`: Access token for user authentication
- `OKOS_ADMIN_USERNAME`: Telegram username of the admin user
- `MODEL_PROVIDER`: AI model provider ('ollama', 'google', 'groq', or 'openai')
- `SEARCH_PROVIDER`: Search provider ('tavily' or 'brave')
- `TAVILY_API_KEY`: Tavily API key for internet searching
- `BRAVE_SEARCH_API_KEY`: Brave Search API key for internet searching
- `OPENWEATHERMAP_API_KEY`: OpenWeatherMap API key for weather information
- `REDIS_URL`: Redis connection URL

### Provider-Specific

- OpenAI:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL_NAME` (default: gpt-4o) - Must support native tool use
  - `OPENAI_UTILITY_MODEL_NAME` (default: gpt-4o-mini) - For utility tasks
  - `OPENAI_VISION_MODEL_NAME` (default: gpt-4o) - For vision tasks
- Google:
  - `GOOGLE_API_KEY`
  - `GOOGLE_MODEL_NAME` (default: gemini-2.0-flash) - Must support native tool use
  - `GOOGLE_UTILITY_MODEL_NAME` (default: gemini-1.5-flash-8b) - For utility tasks
  - `GOOGLE_VISION_MODEL_NAME` (default: gemini-2.0-flash) - For vision tasks
- Groq:
  - `GROQ_API_KEY`
  - `GROQ_MODEL_NAME` (default: llama-3.3-70b-versatile) - Must support native tool use
  - `GROQ_UTILITY_MODEL_NAME` (default: llama-3.1-8b-instant) - For utility tasks
  - `GROQ_VISION_MODEL_NAME` (default: llama-3.2-90b-vision-preview) - For vision tasks
- Ollama:
  - `OLLAMA_API_URL`
  - `OLLAMA_MODEL_NAME` (default: llama3.2) - Must support native tool use
  - `OLLAMA_UTILITY_MODEL_NAME` (default: qwen2.5:1b) - For utility tasks
  - `OLLAMA_VISION_MODEL_NAME` (default: llama-3.2-vision) - For vision tasks

### Optional

- `LANGCHAIN_TRACING_V2`: Enable LangSmith tracing
- `LANGCHAIN_ENDPOINT`: LangSmith endpoint
- `LANGCHAIN_API_KEY`: LangSmith API key
- `LANGCHAIN_PROJECT`: LangSmith project name

## Message Queue System

Okos uses BullMQ to implement robust message processing and reminder systems that ensure:

- Messages from the same user are processed sequentially
- Multiple users can be served concurrently
- The system can handle high loads without crashing
- Failed jobs are properly retried and logged
- Reminders are scheduled and delivered at the specified times

The system implements two specialized queues:

1. **Message Queue** - Handles incoming user messages and ensures sequential processing
2. **Reminder Queue** - Manages scheduled reminders with precise timing using BullMQ's delayed job feature

Detailed documentation about the queue system is available in the [Queue System Documentation](./docs/queue-system.md).

## Available Tools

Okos provides several tools that enhance the AI assistant's capabilities:

1. **Search Tool** - Allows the bot to search the internet for up-to-date information
   - Uses Tavily or Brave Search API to find relevant information
   - Helps answer questions about current events, facts, and general knowledge

2. **Weather Tool** - Provides weather information for any location
   - Retrieves current weather conditions including temperature, humidity, and wind speed
   - Can provide 5-day forecasts when requested
   - Uses OpenWeatherMap API

3. **Reminder System** - Complete reminder management with multiple tools:
   - **Set Reminder Tool** - Creates reminders that will notify the user at specified times
     - Supports both relative time ("in 30 minutes") and absolute time ("at 4:30 PM")
     - Uses BullMQ's delayed job feature for precise timing
   - **Get Reminders Tool** - Lists all pending reminders for the user
     - Shows reminder ID, message content, and scheduled time
     - Helps users track and manage their reminders
   - **Delete Reminder Tool** - Cancels specific reminders by ID
     - Allows users to remove reminders they no longer need
     - Validates that users can only delete their own reminders

## Authentication System

Okos includes a robust authentication system to control who can access and use the bot:

1. **Token-based Authentication**
   - New users must provide the correct access token (`OKOS_TOKEN`) to use the bot
   - Once authenticated, usernames are stored in Redis for persistent access
   - Unauthorized users receive a prompt to enter the token

2. **Admin Controls**
   - Admin user (defined by `OKOS_ADMIN_USERNAME`) has special privileges
   - Admin commands:
     - `/list_users` - View all authorized users
     - `/remove_user <username>` - Remove a user's access

3. **Command Access**
   - Basic commands like `/clear_messages` and `/clear_all` are available to all users
   - Admin commands are restricted to the designated admin user
   - All other bot features require authentication

This system ensures that only authorized users can interact with your bot while providing administrative tools to manage access.

## Model Configuration

Okos uses three different model configurations for specialized tasks:

1. **Chat Model** - The primary model for user interactions

   - **Must support native tool use** (e.g., GPT-4o, Gemini-1.5-flash)
   - Handles the main conversation flow and tool invocation

2. **Utility Model** - For internal utility tasks

   - Used for summarization, memory management, etc.
   - Can be smaller/cheaper models as they don't require tool use

3. **Vision Model** - For processing image inputs
   - Used when users send photos
   - Should have vision capabilities

## Archive Version

An older version of Okos (v1) is available that supports all LLM models for chat functionality, as it used a classifier-based approach instead of native tool use. This version is no longer maintained but may be useful for those using models without native tool capabilities.

- Archive repository: [https://github.com/johnnybui/okos/tree/okos-v1](https://github.com/johnnybui/okos/tree/okos-v1)
- Note: The v1 version has fewer features compared to the current version.

## License

MIT
