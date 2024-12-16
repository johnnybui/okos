import TelegramBot from 'node-telegram-bot-api';

class TelegramService {
  private static instance: TelegramBot;

  static getInstance(): TelegramBot {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
        polling: true,
      });
    }
    return TelegramService.instance;
  }

  static async sendMessage(chatId: number, message: string): Promise<TelegramBot.Message> {
    const bot = TelegramService.getInstance();
    return await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  }

  static async sendChatAction(chatId: number, action: TelegramBot.ChatAction): Promise<boolean> {
    const bot = TelegramService.getInstance();
    return await bot.sendChatAction(chatId, action);
  }

  static async sendSticker(chatId: number, stickerId: string): Promise<TelegramBot.Message> {
    const bot = TelegramService.getInstance();
    return await bot.sendSticker(chatId, stickerId);
  }

  static async deleteMessage(chatId: number, messageId: number): Promise<boolean> {
    const bot = TelegramService.getInstance();
    return await bot.deleteMessage(chatId, messageId);
  }
}

export default TelegramService;
