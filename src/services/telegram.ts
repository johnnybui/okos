import TelegramBot from 'node-telegram-bot-api';

class TelegramService {
  private static instance: TelegramBot;

  static getInstance(): TelegramBot {
    if (!TelegramService.instance) {
      const webHookUrl = process.env.TELEGRAM_WEBHOOK_URL?.replace(/\/$/, ''); // Remove trailing slash if present
      const options: TelegramBot.ConstructorOptions = webHookUrl
        ? {
            webHook: true,
          }
        : {
            polling: true,
          };

      TelegramService.instance = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, options);

      if (webHookUrl) {
        // Set webhook if URL is provided
        TelegramService.instance
          .setWebHook(`${webHookUrl}/webhook`)
          .then(() => {
            console.log('Webhook set successfully to:', `${webHookUrl}/webhook`);
            // Verify webhook info
            return TelegramService.instance.getWebHookInfo();
          })
          .then((info) => {
            console.log('Webhook info:', info);
          })
          .catch((error) => {
            console.error('Error setting webhook:', error);
          });
        console.log('Telegram bot started with webhook mode');
      } else {
        console.log('Telegram bot started with polling mode');
      }
    }
    return TelegramService.instance;
  }

  static async sendMessage(
    chatId: number,
    message: string,
    options?: TelegramBot.SendMessageOptions
  ): Promise<TelegramBot.Message> {
    const bot = TelegramService.getInstance();
    return await bot.sendMessage(chatId, message, options);
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
