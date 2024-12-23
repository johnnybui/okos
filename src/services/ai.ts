import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import axios from 'axios';
import {
  CHAT_CONFIG,
  chatModel,
  classifierModel,
  MODEL_PROVIDER,
  MODEL_VISION_PROVIDER,
  nativeGroqClient,
  summarizeModel,
  visionModel,
} from '../config';
import { PROMPTS } from '../prompts';
import { ChatClassifierSchema, IChatMessage } from '../types';

export class AIService {
  private static mergeSystemMessages(messages: string[], forPromptTemplate = false): SystemMessage | string {
    return forPromptTemplate
      ? messages.filter(Boolean).join('\n\n')
      : new SystemMessage(messages.filter(Boolean).join('\n\n'));
  }

  static async classifyInput(messages: IChatMessage[], lastSummary?: string, memory?: string) {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '{systemPrompt}'],
      ['placeholder', '{messages}'],
    ]);

    const model = classifierModel.withStructuredOutput(ChatClassifierSchema);
    const chain = prompt.pipe(model);

    const systemMessage = this.mergeSystemMessages(
      [
        PROMPTS.CLASSIFY.SYSTEM,
        lastSummary && messages.length > CHAT_CONFIG.maxMessagesBeforeSummary
          ? `- Previous conversation summary:
  <summary>
  ${lastSummary}
  </summary>`
          : '',
        memory
          ? `- Important user information:
  <memory>
  ${memory}
  </memory>`
          : '',
      ],
      true
    );

    const conversationMessages =
      messages.length > CHAT_CONFIG.maxMessagesBeforeSummary && lastSummary
        ? messages.slice(-CHAT_CONFIG.messagesWithSummary)
        : messages.slice(-CHAT_CONFIG.messagesToKeep);

    const response = await chain.invoke({ systemPrompt: systemMessage, messages: conversationMessages });
    return response;
  }

  static async generateResponse({
    messages,
    lastSummary,
    memory,
    searchResults,
    thingsDone,
  }: {
    messages: IChatMessage[];
    lastSummary?: string;
    memory?: string;
    searchResults?: string[];
    thingsDone?: string[];
  }) {
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '{systemPrompt}'],
      ['placeholder', '{messages}'],
    ]);

    const chain = prompt.pipe(chatModel);

    const systemMessage = this.mergeSystemMessages(
      [
        PROMPTS.CHAT.SYSTEM,
        lastSummary && messages.length > CHAT_CONFIG.maxMessagesBeforeSummary
          ? `- Previous conversation summary:
  <summary>
  ${lastSummary}
  </summary>`
          : '',
        memory
          ? `- Important user information:
  <memory>
  ${memory}
  </memory>`
          : '',
        searchResults
          ? `- Search results from other AI Agent:
  <searchResults>
  ${searchResults}
  </searchResults>`
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
      messages.length > CHAT_CONFIG.maxMessagesBeforeSummary && lastSummary
        ? messages.slice(-CHAT_CONFIG.messagesWithSummary)
        : messages.slice(-CHAT_CONFIG.messagesToKeep);

    const response = await chain.invoke({ systemPrompt: systemMessage, messages: conversationMessages });

    return response.content.toString();
  }

  static async generateSummary(messages: IChatMessage[], lastSummary?: string) {
    const systemMessage = this.mergeSystemMessages([
      PROMPTS.SUMMARY.SYSTEM,
      lastSummary
        ? `Previous summary:
  <summary>
  ${lastSummary}
  </summary>`
        : '',
    ]);

    const modelMessages = [
      systemMessage,
      new HumanMessage(messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n')),
    ];

    const response = await summarizeModel.invoke(modelMessages);
    return response.content.toString();
  }

  static async generateMemory(messages: IChatMessage[], existingMemory?: string) {
    const systemMessage = this.mergeSystemMessages([
      PROMPTS.MEMORY.SYSTEM,
      existingMemory
        ? `Existing memory:
  <memory>
  ${existingMemory}
  </memory>`
        : '',
    ]);

    const modelMessages = [
      systemMessage,
      new HumanMessage(messages.map((msg) => `${msg.role}: ${msg.content}`).join('\n')),
    ];

    const response = await summarizeModel.invoke(modelMessages);
    return response.content.toString();
  }

  static async analyzeImage(imageUrls: string[], question?: string) {
    if (imageUrls.length === 0) {
      return 'Images are not recognized.';
    }

    const provider = MODEL_VISION_PROVIDER || MODEL_PROVIDER;

    if (provider === 'openai' || provider === 'ollama') {
      const systemMessage = new SystemMessage(PROMPTS.VISION.SYSTEM);
      const humanMessage = new HumanMessage({
        content: [
          {
            type: 'text',
            text: PROMPTS.VISION.formatUserPrompt(question),
          },
          ...imageUrls.map((url) => ({
            type: 'image_url',
            image_url: { url },
          })),
        ],
      });

      const messages = [systemMessage, humanMessage];

      const response = await visionModel.invoke(messages);
      return response.content.toString();
    }

    // LangChain ChatGroq does not support image input
    // Native Groq SDK only support preview models for vision, only supports one image at the moment
    if (provider === 'groq') {
      const response = await nativeGroqClient.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `${PROMPTS.VISION.SYSTEM}\n\n${PROMPTS.VISION.formatUserPrompt(question)}
Tell user that we are only analyzing the first image`,
              },
              {
                type: 'image_url',
                image_url: { url: imageUrls[0] }, // Groq sdk only supports one image
              },
            ],
          },
        ],
        model: process.env.GROQ_VISION_MODEL_NAME || 'llama-3.2-90b-vision-preview',
        temperature: 0,
      });

      const imageContext = response.choices?.[0]?.message?.content;

      return imageContext || 'User uploaded a photo but we could not analyze it.';
    }

    if (provider === 'google') {
      // For google, fetch the image and convert it to Base64
      const imagesBuffers = await Promise.all(
        imageUrls.map((imageUrl) => axios.get(imageUrl, { responseType: 'arraybuffer' }))
      );
      const imagesData = imagesBuffers.map((buffer) => Buffer.from(buffer.data).toString('base64'));

      const systemMessage = new SystemMessage(PROMPTS.VISION.SYSTEM);
      const humanMessage = new HumanMessage({
        content: [
          {
            type: 'text',
            text: PROMPTS.VISION.formatUserPrompt(question),
          },
          ...imagesData.map((data) => ({
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${data}`,
            },
          })),
        ],
      });

      const messages = [systemMessage, humanMessage];

      const response = await visionModel.invoke(messages);
      return response.content.toString();
    }

    return 'Image analysis is not supported for the current model provider.';
  }
}
