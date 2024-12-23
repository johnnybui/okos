import { redisService } from '../config';
import { ChatContext, IChatContext } from '../types';

export const processUserInputAgent = async (context: typeof ChatContext.State): Promise<IChatContext> => {
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
