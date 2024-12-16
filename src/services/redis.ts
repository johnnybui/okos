import Redis from 'ioredis';
import { CHAT_CONFIG, REDIS_URL } from '../config';
import { IChatState } from '../types';

export class RedisService {
  private client: Redis;
  private readonly prefix = 'chat:';
  private readonly summaryPrefix = 'summary:';
  private readonly messagesPrefix = 'messages:';
  private readonly memoryPrefix = 'memory:';
  private readonly rateLimitPrefix = 'ratelimit:';

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || REDIS_URL);
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

  private getMemoryKey(chatId: number): string {
    return `${this.memoryPrefix}${chatId}`;
  }

  private getRateLimitKey(chatId: number, type: string): string {
    return `${this.rateLimitPrefix}${type}:${chatId}`;
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

  async saveMemory(chatId: number, memory: string): Promise<void> {
    const key = this.getMemoryKey(chatId);
    await this.client.set(key, memory);
  }

  async getMemory(chatId: number): Promise<string | undefined> {
    const key = this.getMemoryKey(chatId);
    return (await this.client.get(key)) || undefined;
  }

  async deleteState(chatId: number): Promise<void> {
    const key = this.getKey(chatId);
    const summaryKey = this.getSummaryKey(chatId);
    const messagesKey = this.getMessagesKey(chatId);
    const memoryKey = this.getMemoryKey(chatId);

    await Promise.all([
      this.client.del(key),
      this.client.del(summaryKey),
      this.client.del(messagesKey),
      this.client.del(memoryKey),
    ]);
  }

  async isRateLimited(chatId: number, type: string, cooldownSeconds: number): Promise<boolean> {
    try {
      const key = this.getRateLimitKey(chatId, type);
      // Use SET NX to atomically check and set the rate limit
      const result = await this.client.set(key, '1', 'EX', cooldownSeconds, 'NX');
      return result === null; // true if rate limited (key exists), false if not rate limited (key was set)
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return false;
    }
  }
}
