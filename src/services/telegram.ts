import TelegramBot from 'node-telegram-bot-api';

class TelegramService {
  private static instance: TelegramBot;
  private static isInitialized = false;

  static getInstance(): TelegramBot {
    if (!TelegramService.instance) {
      // Create the bot instance but don't start polling yet
      TelegramService.instance = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, {
        polling: false // Initialize without polling
      });
    }
    return TelegramService.instance;
  }
  
  /**
   * Start the bot with either webhook or polling mode
   * This should be called only once in the application lifecycle
   */
  static startBot(): void {
    if (TelegramService.isInitialized) {
      console.log('Bot already initialized, skipping');
      return;
    }
    
    const bot = TelegramService.getInstance();
    const webHookUrl = process.env.TELEGRAM_WEBHOOK_URL?.replace(/\/$/, ''); // Remove trailing slash if present
    
    if (webHookUrl) {
      // Set webhook if URL is provided
      bot.setWebHook(`${webHookUrl}/webhook`)
        .then(() => {
          console.log('Webhook set successfully to:', `${webHookUrl}/webhook`);
          // Verify webhook info
          return bot.getWebHookInfo();
        })
        .then((info) => {
          console.log('Webhook info:', info);
        })
        .catch((error) => {
          console.error('Error setting webhook:', error);
        });
      console.log('Telegram bot started with webhook mode');
    } else {
      // Start polling
      bot.startPolling()
        .then(() => {
          console.log('Telegram bot started with polling mode');
        })
        .catch((error) => {
          console.error('Error starting polling:', error);
        });
    }
    
    TelegramService.isInitialized = true;
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
