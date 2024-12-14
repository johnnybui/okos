import express from 'express';
import { createChatGraph } from './graph';
import { RedisService } from './services/redis';
import TelegramService from './services/telegram';

const app = express();
const port = process.env.PORT || 11435;

const redisService = new RedisService();
const graph = createChatGraph();

// Initialize bot using singleton
const bot = TelegramService.getInstance();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

  try {
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
    await bot.sendMessage(chatId, 'Sorry, there was an error processing your message.');
  }
});

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('Telegram bot is running...');
