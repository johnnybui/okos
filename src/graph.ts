import { END, START, StateGraph } from '@langchain/langgraph';
import { CHAT_CONFIG } from './config';
import { AIService } from './services/ai';
import { RedisService } from './services/redis';
import TelegramService from './services/telegram';
import { ChatContext, IChatContext } from './types';

const redisService = new RedisService();

const processUserInput = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId } = context;

  if (!state.messages) {
    state.messages = [];
  }

  const [existingMessages, existingSummary, existingMemory] = await Promise.all([
    redisService.getMessages(chatId),
    redisService.getSummary(chatId),
    redisService.getMemory(chatId),
  ]);

  state.messages = existingMessages;

  if (existingSummary) {
    state.lastSummary = existingSummary;
  }

  if (existingMemory) {
    state.memory = existingMemory;
  }

  state.messages.push({ role: 'user', content: state.currentQuestion || '' });
  await redisService.saveState(chatId, state);

  return {
    state: {
      ...state,
      messages: state.messages,
      lastSummary: state.lastSummary,
      memory: state.memory,
    },
    chatId,
  };
};

const generateResponse = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId } = context;

  await TelegramService.sendChatAction(chatId, 'typing');
  const responseContent = await AIService.generateResponse(chatId, state.messages, state.lastSummary, state.memory);
  state.messages.push({ role: 'assistant', content: responseContent });

  await Promise.all([TelegramService.sendMessage(chatId, responseContent), redisService.saveState(chatId, state)]);

  return { state: { ...state, messages: state.messages }, chatId };
};

const generateSummary = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId } = context;

  const shouldGenerateSummary =
    state.messages.length >= CHAT_CONFIG.maxMessagesBeforeSummary &&
    state.messages[state.messages.length - 1].role === 'assistant';

  if (shouldGenerateSummary) {
    const summary = await AIService.generateSummary(state.messages, state.lastSummary);
    await redisService.saveSummary(chatId, summary);
  }

  return { thingsDone: ['generateSummary'] };
};

const generateMemory = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId } = context;

  const shouldGenerateMemory = state.messages[state.messages.length - 1].role === 'assistant';

  if (shouldGenerateMemory) {
    const memory = await AIService.generateMemory(state.messages, state.memory);
    await redisService.saveMemory(chatId, memory);
  }

  return { thingsDone: ['generateMemory'] };
};

export const createChatGraph = () => {
  const graph = new StateGraph(ChatContext)
    .addNode('processUserInput', processUserInput)
    .addNode('generateResponse', generateResponse)
    .addNode('generateSummary', generateSummary)
    .addNode('generateMemory', generateMemory)

    .addEdge(START, 'processUserInput')
    .addEdge('processUserInput', 'generateResponse')
    .addEdge('generateResponse', 'generateSummary')
    .addEdge('generateResponse', 'generateMemory')
    .addEdge('generateSummary', END)
    .addEdge('generateMemory', END);

  return graph.compile();
};
