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
      messages.length > CHAT_CONFIG.maxMessagesBeforeSummary && lastSummary
        ? messages.slice(-CHAT_CONFIG.messagesWithSummary)
        : messages.slice(-CHAT_CONFIG.messagesToKeep);

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
    const modelMessages = [
      new SystemMessage(PROMPTS.SUMMARY.SYSTEM),
      ...(lastSummary ? [new SystemMessage(`Previous summary: ${lastSummary}`)] : []),
    ];

    modelMessages.push(
      new HumanMessage(
        messages
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join('\n')
      )
    );

    const response = await summarizeModel.invoke(modelMessages);
    return response.content.toString();
  }
}
