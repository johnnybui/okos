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

  static async sendMessage(chatId: number, message: string): Promise<void> {
    const bot = TelegramService.getInstance();
    await bot.sendMessage(chatId, message);
  }

  static async sendChatAction(chatId: number, action: TelegramBot.ChatAction): Promise<void> {
    const bot = TelegramService.getInstance();
    await bot.sendChatAction(chatId, action);
  }
}

export default TelegramService;
