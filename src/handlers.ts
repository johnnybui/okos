import TelegramBot from 'node-telegram-bot-api';
import { CHAT_CONFIG, STICKER } from './config';
import { createChatGraph } from './graph';
import { AIService } from './services/ai';
import { RedisService } from './services/redis';
import TelegramService from './services/telegram';
import { pickRandomElement } from './utils';

const redisService = new RedisService();
const graph = createChatGraph();

export async function handleMessage(chatId: number, text: string) {
  try {
    const isLimited = await redisService.isRateLimited(chatId, 'message', CHAT_CONFIG.messageCooldownSeconds);

    if (isLimited) {
      await TelegramService.sendSticker(chatId, pickRandomElement(STICKER.WRITING));
      return;
    }

    let state = await redisService.getState(chatId);
    if (!state) {
      state = {
        messages: [],
        currentQuestion: text,
      };
    } else {
      state.currentQuestion = text;
    }

    await graph.invoke(
      {
        state,
        chatId: chatId,
      },
      { recursionLimit: 10, maxConcurrency: 3 }
    );
  } catch (error) {
    console.error('Error processing message:', error);
    await TelegramService.sendMessage(chatId, 'Sorry, there was an error processing your message.');
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
  } catch (error) {
    console.error('Error processing photos:', error);
    await TelegramService.sendMessage(chatId, 'Sorry, I had trouble analyzing that image. Please try again.');
  }
}
