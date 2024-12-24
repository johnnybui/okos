import { ChatPromptTemplate } from '@langchain/core/prompts';
import TelegramBot from 'node-telegram-bot-api';
import { CHAT_CONFIG, chatModel, redisService } from '../config';
import { PROMPTS } from '../prompts';
import { AIService } from '../services/ai';
import TelegramService from '../services/telegram';
import { ChatContext, IChatContext } from '../types';
import { isMarkdown } from '../utils';

export const generateResponseAgent = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { state, chatId, searchResults, thingsDone } = context;

  TelegramService.sendChatAction(chatId, 'typing');
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', '{systemPrompt}'],
    ['placeholder', '{messages}'],
  ]);

  const chain = prompt.pipe(chatModel);

  const systemMessage = AIService.mergeSystemMessages(
    [
      PROMPTS.CHAT.SYSTEM,
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
      searchResults
        ? `- Search results from other AI Agent:
<searchResults>
${searchResults}
</searchResults>
- The search results are for your reference to answer user's question or provide links to user when needed.`
        : '',
      thingsDone
        ? `- Things done by other AI Agents:
<thingsDone>
${thingsDone.join('\n')}
</thingsDone>`
        : '',
    ],
    true
  );

  const conversationMessages =
    state.messages.length > CHAT_CONFIG.maxMessagesBeforeSummary && state.lastSummary
      ? state.messages.slice(-CHAT_CONFIG.messagesWithSummary)
      : state.messages.slice(-CHAT_CONFIG.messagesToKeep);

  const response = await chain.invoke({ systemPrompt: systemMessage, messages: conversationMessages });
  const responseContent = response.content.toString();

  state.messages.push({ role: 'assistant', content: responseContent });

  const options: TelegramBot.SendMessageOptions = {};
  if (isMarkdown(responseContent)) {
    options.parse_mode = 'Markdown';
  }

  if (responseContent) {
    await Promise.all([
      TelegramService.sendMessage(chatId, responseContent, options),
      redisService.saveState(chatId, state),
    ]);
  }

  return { state: { ...state, messages: state.messages }, chatId };
};
