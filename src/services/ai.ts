import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import axios from 'axios';
import {
  CHAT_CONFIG,
  chatModel,
  MODEL_PROVIDER,
  MODEL_TOOL_PROVIDER,
  MODEL_VISION_PROVIDER,
  nativeGroqClient,
  summarizeModel,
  visionModel,
} from '../config';
import { PROMPTS } from '../prompts';
import { IChatMessage } from '../types';

export class AIService {
  private static mergeSystemMessages(messages: string[], provider?: string): SystemMessage[] {
    provider = provider || MODEL_PROVIDER;

    if (provider === 'google') {
      // For Google, merge system messages into one
      return [new SystemMessage(messages.filter(Boolean).join('\n\n'))];
    }
    // For other providers, keep system messages separate
    return messages.filter(Boolean).map((msg) => new SystemMessage(msg));
  }

  static async generateResponse(messages: IChatMessage[], lastSummary?: string, memory?: string) {
    const systemMessages = this.mergeSystemMessages([
      PROMPTS.CHAT.SYSTEM,
      lastSummary && messages.length > CHAT_CONFIG.maxMessagesBeforeSummary
        ? `Previous conversation summary: ${lastSummary}`
        : '',
      memory ? `Important user information:\n${memory}` : '',
    ]);

    const conversationMessages =
      messages.length > CHAT_CONFIG.maxMessagesBeforeSummary && lastSummary
        ? messages.slice(-CHAT_CONFIG.messagesWithSummary)
        : messages.slice(-CHAT_CONFIG.messagesToKeep);

    const modelMessages = systemMessages.concat(
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
    const systemMessages = this.mergeSystemMessages(
      [PROMPTS.SUMMARY.SYSTEM, lastSummary ? `Previous summary: ${lastSummary}` : ''],
      MODEL_TOOL_PROVIDER || MODEL_PROVIDER
    );

    const modelMessages = [
      ...systemMessages,
      new HumanMessage(messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n')),
    ];

    const response = await summarizeModel.invoke(modelMessages);
    return response.content.toString();
  }

  static async generateMemory(messages: IChatMessage[], existingMemory?: string) {
    const systemMessages = this.mergeSystemMessages(
      [PROMPTS.MEMORY.SYSTEM, existingMemory ? `Existing memory: ${existingMemory}` : ''],
      MODEL_TOOL_PROVIDER || MODEL_PROVIDER
    );

    const modelMessages = [
      ...systemMessages,
      new HumanMessage(messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n')),
    ];

    const response = await summarizeModel.invoke(modelMessages);
    return response.content.toString();
  }

  static async analyzeImage(imageUrl: string, question?: string) {
    const provider = MODEL_VISION_PROVIDER || MODEL_PROVIDER;

    if (provider === 'openai' || provider === 'ollama') {
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
    if (provider === 'groq') {
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

    if (provider === 'google') {
      // For google, fetch the image and convert it to Base64
      const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageData = Buffer.from(imageRes.data).toString('base64');

      const systemMessage = new SystemMessage(PROMPTS.VISION.SYSTEM);
      const humanMessage = new HumanMessage({
        content: [
          {
            type: 'text',
            text: PROMPTS.VISION.formatUserPrompt(question),
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageData}`,
            },
          },
        ],
      });

      const messages = [systemMessage, humanMessage];

      const response = await visionModel.invoke(messages);
      return response.content.toString();
    }

    return 'Image analysis is not supported for the current model provider.';
  }
}
