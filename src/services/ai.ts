import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { CHAT_CONFIG, chatModel, MODEL_PROVIDER, nativeGroqClient, summarizeModel, visionModel } from '../config';
import { PROMPTS } from '../prompts';
import { IChatMessage } from '../types';

export class AIService {
  static async generateResponse(messages: IChatMessage[], lastSummary?: string, memory?: string) {
    let modelMessages = [];

    if (MODEL_PROVIDER === 'google') {
      // For Google, merge system messages into one
      const systemPrompt = [
        PROMPTS.CHAT.SYSTEM,
        lastSummary && messages.length > CHAT_CONFIG.maxMessagesBeforeSummary
          ? `Previous conversation summary: ${lastSummary}`
          : '',
        memory ? `Important user information:\n${memory}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      modelMessages = [new SystemMessage(systemPrompt)];
    } else {
      // For other providers, keep system messages separate
      modelMessages = [new SystemMessage(PROMPTS.CHAT.SYSTEM)];

      if (messages.length > CHAT_CONFIG.maxMessagesBeforeSummary && lastSummary) {
        modelMessages.push(new SystemMessage(`Previous conversation summary: ${lastSummary}`));
      }

      if (memory) {
        modelMessages.push(new SystemMessage(`Important user information:\n${memory}`));
      }
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
    let modelMessages = [];

    if (MODEL_PROVIDER === 'google') {
      // For Google, merge system messages into one
      const systemPrompt = [PROMPTS.SUMMARY.SYSTEM, lastSummary ? `Previous summary: ${lastSummary}` : '']
        .filter(Boolean)
        .join('\n\n');

      modelMessages = [new SystemMessage(systemPrompt)];
    } else {
      // For other providers, keep system messages separate
      modelMessages = [
        new SystemMessage(PROMPTS.SUMMARY.SYSTEM),
        ...(lastSummary ? [new SystemMessage(`Previous summary: ${lastSummary}`)] : []),
      ];
    }

    modelMessages.push(new HumanMessage(messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n')));

    const response = await summarizeModel.invoke(modelMessages);
    return response.content.toString();
  }

  static async generateMemory(messages: IChatMessage[], existingMemory?: string) {
    let modelMessages = [];

    if (MODEL_PROVIDER === 'google') {
      // For Google, merge system messages into one
      const systemPrompt = [PROMPTS.MEMORY.SYSTEM, existingMemory ? `Existing memory: ${existingMemory}` : '']
        .filter(Boolean)
        .join('\n\n');

      modelMessages = [new SystemMessage(systemPrompt)];
    } else {
      // For other providers, keep system messages separate
      modelMessages = [
        new SystemMessage(PROMPTS.MEMORY.SYSTEM),
        ...(existingMemory ? [new SystemMessage(`Existing memory: ${existingMemory}`)] : []),
      ];
    }

    modelMessages.push(new HumanMessage(messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n')));

    const response = await summarizeModel.invoke(modelMessages);
    return response.content.toString();
  }

  static async analyzeImage(imageUrl: string, question?: string) {
    if (MODEL_PROVIDER === 'openai' || MODEL_PROVIDER === 'ollama') {
      const systemMessage = new SystemMessage(PROMPTS.VISION.SYSTEM);
      const humanMessage = new HumanMessage({
        content: [
          {
            type: 'text',
            text: PROMPTS.VISION.formatUserPrompt(question),
          },
          {
            type: 'image_url',
            image_url: { url: imageUrl },
          },
        ],
      });

      const messages = [systemMessage, humanMessage];

      const response = await visionModel.invoke(messages);
      return response.content.toString();
    }

    // LangChain ChatGroq does not support image input
    // Native Groq SDK only support preview models for vision at the moment
    if (MODEL_PROVIDER === 'groq') {
      const response = await nativeGroqClient.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${PROMPTS.VISION.SYSTEM}\n\n${PROMPTS.VISION.formatUserPrompt(question)}`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl },
              },
            ],
          },
        ],
        model: visionModel.model,
        temperature: 0,
      });

      const imageContext = response.choices?.[0]?.message?.content;

      return imageContext || 'User uploaded a photo but we could not analyze it.';
    }

    return 'User uploaded a photo but current LLM does not support image analysis.';
  }
}
