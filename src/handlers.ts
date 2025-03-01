import { HumanMessage, trimMessages } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import TelegramBot from 'node-telegram-bot-api';
import { mainGraph } from './agents/main/graphs/main.graph';
import { CHAT_CONFIG, STICKER } from './config';
import { AIService } from './services/ai';
import { RedisService } from './services/redis';
import TelegramService from './services/telegram';
import { pickRandomElement } from './utils';

const redisService = new RedisService();

export async function handleMessage(chatId: number, text: string) {
  try {
    const isLimited = await redisService.isRateLimited(chatId, 'message', CHAT_CONFIG.messageCooldownSeconds);

    if (isLimited) {
      await TelegramService.sendSticker(chatId, pickRandomElement(STICKER.WRITING));
      return;
    }

    // Save the human message to Redis
    await redisService.saveHumanMessage(chatId, text);

    // Decrement the summary and memory countdowns
    await redisService.decrementSummaryCountdown(chatId);
    await redisService.decrementMemoryCountdown(chatId);

    // Get the chat state with all messages
    let state = await redisService.getState(chatId);
    if (!state) {
      // If no state exists, create a new one with just this message
      const humanMessage = new HumanMessage(text);
      state = {
        messages: [humanMessage],
      };

      // Initialize countdown values for a new chat
      await redisService.setSummaryCountdown(chatId, CHAT_CONFIG.summarizeEveryNPairOfMessages);
      await redisService.setMemoryCountdown(chatId, CHAT_CONFIG.memorizeEveryNPairOfMessages);
    }

    const trimmedMessages = await trimMessages(state.messages, {
      maxTokens: 4096,
      strategy: 'last',
      tokenCounter: new ChatOpenAI({ model: 'gpt-4o' }),
      startOn: 'human',
      includeSystem: true,
    });

    // Send typing indicator
    await TelegramService.sendChatAction(chatId, 'typing');

    // Invoke the main graph with the messages and chatId
    const result = await mainGraph.invoke(
      {
        messages: trimmedMessages,
        chatId: chatId,
        summary: state.summary,
        memory: state.memory,
      },
      { recursionLimit: 10 }
    );

    // Get the AI response from the result
    if (result.messages && result.messages.length > 0) {
      const lastMessage = result.messages[result.messages.length - 1];
      const aiResponse = lastMessage.content.toString();

      // Send the AI response to the user
      await TelegramService.sendMessage(chatId, aiResponse);

      // Save the AI response to Redis
      await redisService.saveAIMessage(chatId, aiResponse);
    }
  } catch (error: any) {
    console.error('Error processing message:', error);
    if (error.status === 429) {
      await TelegramService.sendMessage(chatId, 'You have exceeded the rate limit. Please try again later.');
      return;
    }

    await TelegramService.sendMessage(chatId, 'Sorry, there was an error processing your message.');
  }
}

export async function handleClearHistory(chatId: number) {
  try {
    await redisService.clearAll(chatId);
    await TelegramService.sendMessage(chatId, 'Your chat history, summary, and memory have been cleared.');
  } catch (error) {
    console.error('Error clearing chat history:', error);
    await TelegramService.sendMessage(chatId, 'Sorry, there was an error clearing your data.');
  }
}

export async function handlePhoto(chatId: number, photos: TelegramBot.PhotoSize[], caption?: string) {
  try {
    const isLimited = await redisService.isRateLimited(chatId, 'photo', CHAT_CONFIG.photoCooldownSeconds);

    if (isLimited) {
      await TelegramService.sendSticker(chatId, pickRandomElement(STICKER.CALM_DOWN));
      return;
    }

    const fileLinks = await Promise.all(
      photos
        .slice(0, CHAT_CONFIG.maxPhotosInMessage) // Pick first photos due to limit of maxPhotosInMessage
        .map((photo) => TelegramService.getInstance().getFileLink(photo.file_id))
    );

    const pleaseWaitStickerMsg = await TelegramService.sendSticker(chatId, pickRandomElement(STICKER.WAIT));
    TelegramService.sendChatAction(chatId, 'typing');

    const analysis = await AIService.analyzeImage(fileLinks, caption);
    const additionalInstructions = `Additional System Prompt (this instruction is in English but you must respond in language that user is speaking)`;
    let messageText = caption
      ? `${additionalInstructions}: \n\n [User shared you ${fileLinks.length} Photo(s) along with message: "${caption}"]\n\nPhoto(s) are analyzed by another AI agent and are about: ${analysis}`
      : `${additionalInstructions}: \n\n [User shared you ${fileLinks.length} Photo(s) without any message]\n\nPhoto(s) are analyzed by another AI agent and are about: ${analysis}`;

    if (photos.length > fileLinks.length) {
      messageText += `\n\n Tell user that you only analyzed the first ${fileLinks.length} photos.`;
    }

    await handleMessage(chatId, messageText);
    TelegramService.deleteMessage(chatId, pleaseWaitStickerMsg.message_id);
  } catch (error: any) {
    console.error('Error processing photos:', error);
    if (error.status === 429) {
      await TelegramService.sendMessage(chatId, 'You have exceeded the rate limit. Please try again later.');
      return;
    }

    await TelegramService.sendMessage(chatId, 'Sorry, I had trouble analyzing that image. Please try again.');
  }
}
