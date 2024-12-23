import { redisService } from '../config';
import { AIService } from '../services/ai';
import TelegramService from '../services/telegram';
import { ChatContext, IChatContext } from '../types';

export const generateResponseAgent = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId, searchResults, thingsDone } = context;

  TelegramService.sendChatAction(chatId, 'typing');
  const responseContent = await AIService.generateResponse({
    messages: state.messages,
    lastSummary: state.lastSummary,
    memory: state.memory,
    searchResults,
    thingsDone,
  });
  state.messages.push({ role: 'assistant', content: responseContent });

  if (responseContent) {
    await Promise.all([TelegramService.sendMessage(chatId, responseContent), redisService.saveState(chatId, state)]);
  }

  return { state: { ...state, messages: state.messages }, chatId };
};
