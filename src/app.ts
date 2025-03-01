import { Elysia } from 'elysia';
import TelegramBot from 'node-telegram-bot-api';
import { handleClearHistory, handleMessage, handlePhoto } from './handlers';
import TelegramService from './services/telegram';

const port = process.env.PORT || 11435;

// Initialize bot using singleton
const bot = TelegramService.getInstance();

new Elysia()
  .get('/', async () => {
    const isPolling = await bot.isPolling();
    const botUser = await bot.getMe();

    return `<a href="https://t.me/${botUser.username}">${botUser.username}</a> is online!<br />Mode: ${
      isPolling ? 'Polling' : 'Webhook'
    }`;
  })
  .post('/webhook', ({ body }: { body: TelegramBot.Update }) => {
    bot.processUpdate(body);
    return 'ok';
  })
  .listen(port, () => {
    console.log(`🦊 Elysia app listening on port ${port}`);
  });

// Set up command handlers
bot.setMyCommands([
  { command: 'clear', description: 'Clear your chat history' },
]);

bot.on('text', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) {
    return;
  }

  // Check for commands
  if (text === '/clear') {
    handleClearHistory(chatId);
    return;
  }

  handleMessage(chatId, text);
});

// Store photos by media group ID
const mediaGroups = new Map<string, { photos: TelegramBot.PhotoSize[]; caption?: string }>();

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const photos = msg.photo;
  const caption = msg.caption;
  const mediaGroupId = msg.media_group_id;

  if (!photos) return;

  const photo = photos[2] || photos[1] || photos[0]; // Get the photo with from medium resolution (index 2)

  if (!mediaGroupId) {
    // Single photo - process immediately
    handlePhoto(chatId, [photo], caption);
    return;
  }

  // Multiple photos - collect them first
  if (!mediaGroups.has(mediaGroupId)) {
    mediaGroups.set(mediaGroupId, { photos: [], caption });
  }

  const group = mediaGroups.get(mediaGroupId)!;
  group.photos.push(photo);

  // Process after a short delay to ensure we have all photos
  setTimeout(() => {
    const group = mediaGroups.get(mediaGroupId);
    if (group) {
      handlePhoto(chatId, group.photos, group.caption);
      mediaGroups.delete(mediaGroupId);
    }
  }, 1000); // Wait 1 second to collect all photos
});

bot.on('sticker', async (msg) => {
  const chatId = msg.chat.id;
  const sticker = msg.sticker;
  const emoji = sticker?.emoji;

  if (emoji) {
    return handleMessage(chatId, emoji);
  }

  if (sticker?.file_id) {
    return bot.sendSticker(chatId, sticker.file_id);
  }
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('webhook_error', (error) => {
  console.error('Webhook error:', error);
});

bot.on('error', (error) => {
  console.error('General error:', error);
});
