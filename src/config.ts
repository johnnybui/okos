import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import Groq from 'groq-sdk';
import { RedisService } from './services/redis';

export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisService = new RedisService();

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';

type ModelProvider = 'ollama' | 'google' | 'groq' | 'openai';
export const MODEL_PROVIDER = (process.env.MODEL_PROVIDER || 'ollama') as ModelProvider;
export const MODEL_VISION_PROVIDER = (process.env.MODEL_VISION_PROVIDER || MODEL_PROVIDER) as ModelProvider;
export const MODEL_UTILITY_PROVIDER = (process.env.MODEL_UTILITY_PROVIDER || MODEL_PROVIDER) as ModelProvider;

function createChatModel(type: 'chat' | 'utility' | 'vision') {
  const temperature = type === 'chat' ? 0.5 : 0;

  switch (type) {
    case 'vision': {
      const provider = MODEL_VISION_PROVIDER || MODEL_PROVIDER;
      switch (provider) {
        case 'openai':
          return new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY!,
            modelName: process.env.OPENAI_VISION_MODEL_NAME || 'gpt-4o',
            temperature,
            maxRetries: 2,
          });
        case 'google':
          return new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY!,
            modelName: process.env.GOOGLE_VISION_MODEL_NAME || 'gemini-1.5-pro',
            temperature,
            maxRetries: 2,
          });
        case 'groq':
          return new ChatGroq({
            apiKey: process.env.GROQ_API_KEY!,
            modelName: process.env.GROQ_VISION_MODEL_NAME || 'llama-3.2-90b-vision-preview',
            temperature,
            maxRetries: 2,
          });
        case 'ollama':
        default:
          return new ChatOllama({
            baseUrl: OLLAMA_API_URL,
            model: process.env.OLLAMA_VISION_MODEL_NAME || 'llama3.2-vision',
            temperature,
            maxRetries: 2,
          });
      }
    }

    case 'utility': {
      const provider = MODEL_UTILITY_PROVIDER || MODEL_PROVIDER;
      switch (provider) {
        case 'openai':
          return new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY!,
            modelName: process.env.OPENAI_UTILITY_MODEL_NAME || 'gpt-4o-mini',
            temperature,
            maxRetries: 2,
          });
        case 'google':
          return new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY!,
            modelName: process.env.GOOGLE_UTILITY_MODEL_NAME || 'gemini-1.5-flash',
            temperature,
            maxRetries: 2,
          });
        case 'groq':
          return new ChatGroq({
            apiKey: process.env.GROQ_API_KEY!,
            modelName: process.env.GROQ_UTILITY_MODEL_NAME || 'llama-3.1-8b-instant',
            temperature,
            maxRetries: 2,
          });
        case 'ollama':
        default:
          return new ChatOllama({
            baseUrl: OLLAMA_API_URL,
            model: process.env.OLLAMA_UTILITY_MODEL_NAME || 'qwen2.5:1b',
            temperature,
            maxRetries: 2,
          });
      }
    }

    case 'chat':
    default: {
      let chatModel: ChatOpenAI | ChatGoogleGenerativeAI | ChatGroq | ChatOllama;

      switch (MODEL_PROVIDER) {
        case 'openai':
          chatModel = new ChatOpenAI({
            apiKey: process.env.OPENAI_API_KEY!,
            modelName: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
            temperature,
            maxRetries: 2,
          });
          break;
        case 'google':
          chatModel = new ChatGoogleGenerativeAI({
            apiKey: process.env.GOOGLE_API_KEY!,
            modelName: process.env.GOOGLE_MODEL_NAME || 'gemini-1.5-pro',
            temperature,
            maxRetries: 2,
          });
          break;
        case 'groq':
          chatModel = new ChatGroq({
            apiKey: process.env.GROQ_API_KEY!,
            modelName: process.env.GROQ_MODEL_NAME || 'gemma2-9b-it',
            temperature,
            maxRetries: 2,
          });
          break;
        case 'ollama':
        default:
          chatModel = new ChatOllama({
            baseUrl: OLLAMA_API_URL,
            model: process.env.OLLAMA_MODEL_NAME || 'llama3.2',
            temperature,
            maxRetries: 2,
          });
          break;
      }

      return chatModel;
    }
  }
}

export const chatModel = createChatModel('chat');
export const classifierModel = createChatModel('utility');
export const summarizeModel = createChatModel('utility');
export const visionModel = createChatModel('vision');

export const nativeGroqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
  maxRetries: 2,
});

export const CHAT_CONFIG = {
  minMessagesBeforeSummary: 6, // Number of messages before triggering summary
  messagesToKeep: 20, // Number of recent messages to keep in context
  summarizeEveryNPairOfMessages: 3, // Run summarize & memorize agent every 5 messages
  messageCooldownSeconds: 3,
  photoCooldownSeconds: 10,
  maxPhotosInMessage: 5,
} as const;

export const QUEUE_CONFIG = {
  maxJobsPerUser: 1, // Only 1 job at a time per user
  jobsPer5Seconds: 1, // Rate limit per user
  retryAttempts: 3, // Number of retry attempts for failed jobs
  removeOnComplete: true, // Remove completed jobs
  removeOnFail: 100, // Keep the last 100 failed jobs
} as const;

export const STICKER = {
  CALM_DOWN: ['CAACAgEAAxkBAAOMZ1-PTzHWqvt_DRwwUxlL-oBtLE4AAs8BAAI4DoIRnu4VKzeS-Og2BA'],
  WRITING: ['CAACAgIAAxkBAAOSZ1-RSUrBUu3yQVTPY2eSVpxjQfEAAscKAAL8ZQFK3xJDDRnCQEE2BA'],
  WAIT: [
    'CAACAgIAAxkBAAOUZ1-RvLfRDcMh9_KjpGr8q_uyU30AAiwAAyRxYhrFIOYD73j85DYE',
    'CAACAgEAAxkBAAICFWdiTp_D2k3ECqJHkpaD777pvLVUAAIDAwAC54zYRtJM1QZbUVMyNgQ',
  ],
  SEARCHING: [
    'CAACAgIAAxkBAAIBU2dgEbkFtLnf4or-dlN5C5pCjWDtAAJWAAMNttIZ3DOhnyotnbI2BA',
    'CAACAgIAAxkBAAICDGdiTZEtMhBguqreSW-UZFnmAAFMjgAC-BIAAlo16Uhs4hFMpJkFTjYE',
    'CAACAgIAAxkBAAICDmdiTcG5Uhr_eicBbOO8FK4mkVNPAALHCwACQGeYSn4PPWF3xE_4NgQ',
    'CAACAgIAAxkBAAICEWdiTfRpQ3hKcY_GKnGZQtFBFKSTAAIsFAAClguISc28MED3qvgaNgQ',
    'CAACAgIAAxkBAAICE2diTfim7FTOkFw_DzldrkudHoi7AAIlDwACS5ORSOscHL4fo5kKNgQ',
  ],
};
