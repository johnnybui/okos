import { CHAT_CONFIG, redisService } from '../config';
import { AIService } from '../services/ai';
import { ChatContext, IChatContext } from '../types';

export const generateSummaryAgent = async (context: typeof ChatContext.State): Promise<IChatContext> => {
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
