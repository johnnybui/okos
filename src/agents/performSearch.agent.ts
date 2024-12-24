import { STICKER } from '../config';
import TelegramService from '../services/telegram';
import { searchTool } from '../tools';
import { ChatContext, IChatContext } from '../types';
import { pickRandomElement } from '../utils';

export const performSearchAgent = async (context: typeof ChatContext.State): Promise<IChatContext> => {
  const { searchNeeded, searchQuery, chatId } = context;

  if (!searchNeeded) {
    return {};
  }

  const searchingStickerMsg = await TelegramService.sendSticker(chatId, pickRandomElement(STICKER.SEARCHING));
  TelegramService.sendChatAction(chatId, 'typing');

  let searchResults;
  try {
    searchResults = await searchTool.invoke(searchQuery);
  } catch (error) {
    console.error('Error performing search:', error);
    searchResults = 'There was an error performing the search. Tell user to try again later.';
  }

  TelegramService.deleteMessage(chatId, searchingStickerMsg.message_id);

  return { searchResults, thingsDone: ['performSearch'] };
};
