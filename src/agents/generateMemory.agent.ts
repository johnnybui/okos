import { HumanMessage } from '@langchain/core/messages';
import { redisService, summarizeModel } from '../config';
import { PROMPTS } from '../prompts';
import { AIService } from '../services/ai';
import { ChatContext, IChatContext } from '../types';

export const generateMemoryAgent = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId } = context;

  const shouldGenerateMemory = state.messages[state.messages.length - 1].role === 'assistant';

  if (shouldGenerateMemory) {
    const systemMessage = AIService.mergeSystemMessages([
      PROMPTS.MEMORY.SYSTEM,
      state.memory
        ? `Existing memory:
    <memory>
    ${state.memory}
    </memory>`
        : '',
    ]);

    const modelMessages = [
      systemMessage,
      new HumanMessage(state.messages.map((msg) => `<${msg.role}>\n${msg.content}\n</${msg.role}>`).join('\n')),
    ];

    const response = await summarizeModel.invoke(modelMessages);
    const memory = response.content.toString();

    await redisService.saveMemory(chatId, memory);
  }

  return { thingsDone: ['generateMemory'] };
};
