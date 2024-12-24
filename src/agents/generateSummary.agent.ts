import { HumanMessage } from '@langchain/core/messages';
import { CHAT_CONFIG, redisService, summarizeModel } from '../config';
import { PROMPTS } from '../prompts';
import { AIService } from '../services/ai';
import { ChatContext, IChatContext } from '../types';

export const generateSummaryAgent = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId } = context;

  const shouldGenerateSummary =
    state.messages.length >= CHAT_CONFIG.maxMessagesBeforeSummary &&
    state.messages[state.messages.length - 1].role === 'assistant';

  if (shouldGenerateSummary) {
    const systemMessage = AIService.mergeSystemMessages([
      PROMPTS.SUMMARY.SYSTEM,
      state.lastSummary
        ? `Previous summary:
    <summary>
    ${state.lastSummary}
    </summary>`
        : '',
    ]);

    const modelMessages = [
      systemMessage,
      new HumanMessage(state.messages.map((msg) => `<${msg.role}>\n${msg.content}\n</${msg.role}>`).join('\n')),
    ];

    const response = await summarizeModel.invoke(modelMessages);
    const summary = response.content.toString();

    await redisService.saveSummary(chatId, summary);
  }

  return { thingsDone: ['generateSummary'] };
};
