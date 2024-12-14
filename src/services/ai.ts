import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { CHAT_CONFIG, chatModel, summarizeModel } from '../config';
import { PROMPTS } from '../prompts';
import { IChatMessage } from '../types';

export class AIService {
  static async generateResponse(messages: IChatMessage[], lastSummary?: string) {
    let modelMessages = [new SystemMessage(PROMPTS.CHAT.SYSTEM)];

    if (messages.length > CHAT_CONFIG.maxMessagesBeforeSummary && lastSummary) {
      modelMessages.push(new SystemMessage(`Previous conversation summary: ${lastSummary}`));
    }

    const conversationMessages =
      messages.length > CHAT_CONFIG.maxMessagesBeforeSummary ? messages.slice(-CHAT_CONFIG.messagesToKeep) : messages;

    modelMessages = modelMessages.concat(
      conversationMessages.map((msg) =>
        msg.role === 'user'
          ? new HumanMessage(msg.content)
          : msg.role === 'assistant'
          ? new AIMessage(msg.content)
          : new SystemMessage(msg.content)
      )
    );

    const response = await chatModel.invoke(modelMessages);
    return response.content.toString();
  }

  static async generateSummary(messages: IChatMessage[], lastSummary?: string) {
    const lastMessages = messages.slice(-CHAT_CONFIG.messagesToKeep);
    const messagesForSummary = lastMessages.map((msg) => `${msg.role}: ${msg.content}`).join('\n');

    const summaryResponse = await summarizeModel.invoke([
      new SystemMessage(PROMPTS.SUMMARY.SYSTEM),
      new HumanMessage(PROMPTS.SUMMARY.formatUserPrompt(lastSummary, messagesForSummary)),
    ]);

    return summaryResponse.content.toString();
  }
}
