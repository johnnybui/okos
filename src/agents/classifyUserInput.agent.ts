import { ChatPromptTemplate } from '@langchain/core/prompts';
import { CHAT_CONFIG, classifierModel } from '../config';
import { PROMPTS } from '../prompts';
import { AIService } from '../services/ai';
import TelegramService from '../services/telegram';
import { ChatClassifierSchema, ChatContext, IChatContext } from '../types';

export const classifyUserInputAgent = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId } = context;

  TelegramService.sendChatAction(chatId, 'typing');

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', '{systemPrompt}'],
    ['placeholder', '{messages}'],
  ]);

  const model = classifierModel.withStructuredOutput(ChatClassifierSchema);
  const chain = prompt.pipe(model);

  const systemMessage = AIService.mergeSystemMessages(
    [
      PROMPTS.CLASSIFY.SYSTEM,
      state.lastSummary && state.messages.length > CHAT_CONFIG.maxMessagesBeforeSummary
        ? `- Previous conversation summary:
  <summary>
  ${state.lastSummary}
  </summary>`
        : '',
      state.memory
        ? `- Important user information:
  <memory>
  ${state.memory}
  </memory>`
        : '',
    ],
    true
  );

  const conversationMessages =
    state.messages.length > CHAT_CONFIG.maxMessagesBeforeSummary && state.lastSummary
      ? state.messages.slice(-CHAT_CONFIG.messagesWithSummary)
      : state.messages.slice(-CHAT_CONFIG.messagesToKeep);

  const { searchNeeded, searchQuery } = await chain.invoke({
    systemPrompt: systemMessage,
    messages: conversationMessages,
  });

  return { searchNeeded, searchQuery, chatId };
};
