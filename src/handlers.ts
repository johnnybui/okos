import TelegramBot from 'node-telegram-bot-api';
import { STICKER } from './config';
import { createChatGraph } from './graph';
import { AIService } from './services/ai';
import { RedisService } from './services/redis';
import TelegramService from './services/telegram';

const redisService = new RedisService();
const graph = createChatGraph();

// Rate limit settings
const MESSAGE_COOLDOWN_SECONDS = 3;
const PHOTO_COOLDOWN_SECONDS = 10;

export async function handleMessage(chatId: number, text: string) {
  try {
    const isLimited = await redisService.isRateLimited(chatId, 'message', MESSAGE_COOLDOWN_SECONDS);

    if (isLimited) {
      await TelegramService.sendSticker(chatId, STICKER.WRITING);
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
    const isLimited = await redisService.isRateLimited(chatId, 'photo', PHOTO_COOLDOWN_SECONDS);

    if (isLimited) {
      await TelegramService.sendSticker(chatId, STICKER.CALM_DOWN);
      return;
    }

    // Get the photo with from medium resolution (index 2)
    const photo = photos[2] || photos[1] || photos[0];
    const fileLink = await TelegramService.getInstance().getFileLink(photo.file_id);

    await TelegramService.sendChatAction(chatId, 'typing');
    const pleaseWaitStickerMsg = await TelegramService.sendSticker(chatId, STICKER.WAIT);

    const analysis = await AIService.analyzeImage(fileLink, caption);
    const messageText = caption
      ? `[User sent you a Photo with caption: "${caption}"]\n\nPhoto is analyzed by another AI agent and is about: ${analysis}`
      : `[User sent you a Photo]\n\nPhoto is analyzed by another AI agent and is about: ${analysis}`;

    await handleMessage(chatId, messageText);
    TelegramService.deleteMessage(chatId, pleaseWaitStickerMsg.message_id);
  } catch (error) {
    console.error('Error processing photo:', error);
    await TelegramService.sendMessage(chatId, 'Sorry, I had trouble analyzing that image. Please try again.');
  }
}
