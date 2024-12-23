import { redisService } from '../config';
import { AIService } from '../services/ai';
import { ChatContext, IChatContext } from '../types';

export const generateMemoryAgent = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId } = context;

  const shouldGenerateMemory = state.messages[state.messages.length - 1].role === 'assistant';

  if (shouldGenerateMemory) {
    const memory = await AIService.generateMemory(state.messages, state.memory);
    await redisService.saveMemory(chatId, memory);
  }

  return { thingsDone: ['generateMemory'] };
};
