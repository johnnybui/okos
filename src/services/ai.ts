import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MODEL_PROVIDER, MODEL_VISION_PROVIDER, nativeGroqClient, visionModel } from '../config';
import { PROMPTS } from '../prompts';

export class AIService {
  static mergeSystemMessages(messages: string[], forPromptTemplate = false): SystemMessage | string {
    return forPromptTemplate
      ? messages.filter(Boolean).join('\n\n')
      : new SystemMessage(messages.filter(Boolean).join('\n\n'));
  }

  static async analyzeImage(imageUrls: string[], question?: string) {
    if (imageUrls.length === 0) {
      return 'Images are not recognized.';
    }

    const provider = MODEL_VISION_PROVIDER || MODEL_PROVIDER;

    if (provider === 'openai' || provider === 'ollama') {
      const systemMessage = new SystemMessage(PROMPTS.VISION.SYSTEM());
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
                text: `${PROMPTS.VISION.SYSTEM()}\n\n${PROMPTS.VISION.formatUserPrompt(question)}
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
        imageUrls.map((imageUrl) => fetch(imageUrl).then((res) => res.arrayBuffer()))
      );
      const imagesData = imagesBuffers.map((buffer) => Buffer.from(buffer).toString('base64'));

      const systemMessage = new SystemMessage(PROMPTS.VISION.SYSTEM());
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
