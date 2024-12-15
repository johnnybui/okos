import express from 'express';
import { handleMessage, handlePhoto } from './handlers';
import TelegramService from './services/telegram';

const app = express();
const port = process.env.PORT || 11435;

// Initialize bot using singleton
const bot = TelegramService.getInstance();

// Health check endpoint
app.get('/', (req, res) => {
  res.send('OK');
});

// Start express server
app.listen(port, () => {
  console.log(`Health check server listening on port ${port}`);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) {
    return;
  }

  handleMessage(chatId, text);
});

bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const photos = msg.photo;
  const caption = msg.caption;

  if (!photos) return;

  handlePhoto(chatId, photos, caption);
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('Telegram bot is running...');
