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

  const [existingMessages, existingSummary] = await Promise.all([
    redisService.getMessages(chatId),
    redisService.getSummary(chatId),
  ]);

  state.messages = existingMessages;

  if (existingSummary) {
    state.lastSummary = existingSummary;
  }

  state.messages.push({ role: 'user', content: state.currentQuestion || '' });
  await redisService.saveState(chatId, state);

  return {
    state: {
      ...state,
      messages: state.messages,
      lastSummary: state.lastSummary,
    },
    chatId,
  };
};

const generateResponse = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId } = context;

  await TelegramService.sendChatAction(chatId, 'typing');
  const responseContent = await AIService.generateResponse(state.messages, state.lastSummary);
  state.messages.push({ role: 'assistant', content: responseContent });
  
  await Promise.all([
    TelegramService.sendMessage(chatId, responseContent),
    redisService.saveState(chatId, state)
  ]);

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
    state.lastSummary = summary;
  }

  return { state: { ...state, lastSummary: state.lastSummary }, chatId };
};

export const createChatGraph = () => {
  const graph = new StateGraph(ChatContext)
    .addNode('processUserInput', processUserInput)
    .addNode('generateResponse', generateResponse)
    .addNode('generateSummary', generateSummary)
    .addEdge(START, 'processUserInput')
    .addEdge('processUserInput', 'generateResponse')
    .addEdge('generateResponse', 'generateSummary')
    .addEdge('generateSummary', END);

  return graph.compile();
};
