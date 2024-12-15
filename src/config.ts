import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

type ModelProvider = 'ollama' | 'google' | 'groq' | 'openai';
const MODEL_PROVIDER = (process.env.MODEL_PROVIDER || 'ollama') as ModelProvider;

function createChatModel(type: 'chat' | 'summary') {
  const isChat = type === 'chat';

  switch (MODEL_PROVIDER) {
    case 'openai':
      return new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
        modelName: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
        temperature: isChat ? 0.7 : 0,
        maxRetries: 2,
      });

    case 'google':
      return new ChatGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY!,
        modelName: process.env.GOOGLE_MODEL_NAME || 'gemini-pro',
        temperature: isChat ? 0.7 : 0,
        maxRetries: 2,
      });

    case 'groq':
      return new ChatGroq({
        apiKey: process.env.GROQ_API_KEY!,
        modelName: process.env.GROQ_MODEL_NAME || 'llama-3.3-70b-versatile',
        temperature: isChat ? 0.7 : 0,
        maxRetries: 2,
      });

    case 'ollama':
    default:
      return new ChatOllama({
        baseUrl: OLLAMA_API_URL,
        model: process.env.MODEL_NAME || 'llama3.2',
        temperature: isChat ? 0.7 : 0,
        maxRetries: 2,
      });
  }
}

export const chatModel = createChatModel('chat');
export const summarizeModel = createChatModel('summary');

export const CHAT_CONFIG = {
  maxMessagesBeforeSummary: 6, // Number of messages before triggering summary
  messagesToKeep: 6, // Number of recent messages to keep in context
  messagesWithSummary: 2, // Number of recent messages to keep when summary is included
} as const;
