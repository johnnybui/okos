import { AIService } from '../services/ai';
import TelegramService from '../services/telegram';
import { ChatContext, IChatContext } from '../types';

export const classifyUserInputAgent = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId } = context;

  TelegramService.sendChatAction(chatId, 'typing');
  const { searchNeeded, searchQuery } = await AIService.classifyInput(state.messages, state.lastSummary, state.memory);

  return { searchNeeded, searchQuery, chatId };
};
