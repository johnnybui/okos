import { ChatOllama } from '@langchain/ollama';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const chatModel = new ChatOllama({
  baseUrl: OLLAMA_API_URL,
  model: process.env.MODEL_NAME || 'llama3.2',
  temperature: 0.7,
  maxRetries: 2,
});

export const summarizeModel = new ChatOllama({
  baseUrl: OLLAMA_API_URL,
  model: process.env.MODEL_NAME || 'llama3.2',
  temperature: 0,
  maxRetries: 2,
});

export const initialSystemPrompt = `You are Okos, my AI assistant. You are a helpful assistant that can answer questions about anything.`;

export const CHAT_CONFIG = {
  maxMessagesBeforeSummary: 10, // Number of messages before triggering summary
  messagesToKeep: 10, // Number of recent messages to keep in context
} as const;
