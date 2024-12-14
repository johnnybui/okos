import Redis from 'ioredis';
import { CHAT_CONFIG } from '../config';
import { IChatState } from '../types';

export class RedisService {
  private client: Redis;
  private readonly prefix = 'chat:';
  private readonly summaryPrefix = 'summary:';
  private readonly messagesPrefix = 'messages:';

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  private getKey(chatId: number): string {
    return `${this.prefix}${chatId}`;
  }

  private getSummaryKey(chatId: number): string {
    return `${this.summaryPrefix}${chatId}`;
  }

  private getMessagesKey(chatId: number): string {
    return `${this.messagesPrefix}${chatId}`;
  }

  async saveState(chatId: number, state: IChatState): Promise<void> {
    const key = this.getKey(chatId);
    const messagesKey = this.getMessagesKey(chatId);

    const existingMessages = await this.getMessages(chatId);
    const existingCount = existingMessages.length;
    const newMessages = state.messages.slice(existingCount);

    if (newMessages.length > 0) {
      const multi = this.client.multi();

      for (const message of newMessages) {
        multi.rpush(messagesKey, JSON.stringify(message));
      }

      await multi
        .ltrim(messagesKey, -CHAT_CONFIG.messagesToKeep, -1)
        .set(key, JSON.stringify({ ...state, messages: [] }))
        .exec();
    } else {
      await this.client.set(key, JSON.stringify({ ...state, messages: [] }));
    }
  }

  async getState(chatId: number): Promise<IChatState | null> {
    const key = this.getKey(chatId);
    const data = await this.client.get(key);

    if (!data) return null;

    try {
      const state = JSON.parse(data) as IChatState;
      return state;
    } catch (error) {
      console.error('Error parsing state from Redis:', error);
      return null;
    }
  }

  async getMessages(chatId: number): Promise<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> {
    const messagesKey = this.getMessagesKey(chatId);

    try {
      const messages = await this.client.lrange(messagesKey, 0, -1);
      return messages.map((msg) => JSON.parse(msg));
    } catch (error) {
      console.error('Error getting messages from Redis:', error);
      return [];
    }
  }

  async saveSummary(chatId: number, summary: string): Promise<void> {
    const key = this.getSummaryKey(chatId);
    await this.client.set(key, summary);
  }

  async getSummary(chatId: number): Promise<string | null> {
    const key = this.getSummaryKey(chatId);
    return await this.client.get(key);
  }

  async deleteState(chatId: number): Promise<void> {
    const key = this.getKey(chatId);
    const summaryKey = this.getSummaryKey(chatId);
    const messagesKey = this.getMessagesKey(chatId);

    await Promise.all([this.client.del(key), this.client.del(summaryKey), this.client.del(messagesKey)]);
  }
}
