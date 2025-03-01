import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import Redis from 'ioredis';
import { CHAT_CONFIG, REDIS_URL } from '../config';

export interface ChatState {
  messages: BaseMessage[];
  summary?: string;
  memory?: string;
  chatId?: number;
}

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

  private getSummaryCountdownKey(chatId: number): string {
    return `${this.summaryPrefix}countdown:${chatId}`;
  }

  private getMemoryCountdownKey(chatId: number): string {
    return `${this.memoryPrefix}countdown:${chatId}`;
  }

  private getRateLimitKey(chatId: number, type: string): string {
    return `${this.rateLimitPrefix}${type}:${chatId}`;
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

  /**
   * Save a human message to Redis
   */
  async saveHumanMessage(chatId: number, content: string): Promise<void> {
    try {
      const message = {
        type: 'human',
        content,
        timestamp: Date.now(),
      };
      await this.client.rpush(this.getMessagesKey(chatId), JSON.stringify(message));
      await this.trimMessages(chatId);
    } catch (error) {
      console.error('Error saving human message:', error);
    }
  }

  /**
   * Save an AI message to Redis
   */
  async saveAIMessage(chatId: number, content: string): Promise<void> {
    try {
      const message = {
        type: 'ai',
        content,
        timestamp: Date.now(),
      };
      await this.client.rpush(this.getMessagesKey(chatId), JSON.stringify(message));
      await this.trimMessages(chatId);
    } catch (error) {
      console.error('Error saving AI message:', error);
    }
  }

  /**
   * Trim the message history to the specified limit
   */
  private async trimMessages(chatId: number): Promise<void> {
    try {
      const messagesKey = this.getMessagesKey(chatId);
      const length = await this.client.llen(messagesKey);
      if (length > CHAT_CONFIG.messagesToKeep) {
        await this.client.ltrim(messagesKey, length - CHAT_CONFIG.messagesToKeep, -1);
      }
    } catch (error) {
      console.error('Error trimming messages:', error);
    }
  }

  /**
   * Get all messages for a chat
   */
  async getMessages(chatId: number): Promise<BaseMessage[]> {
    try {
      const messagesKey = this.getMessagesKey(chatId);
      const rawMessages = await this.client.lrange(messagesKey, 0, -1);

      return rawMessages.map((rawMessage) => {
        const message = JSON.parse(rawMessage);
        if (message.type === 'human') {
          return new HumanMessage(message.content);
        } else if (message.type === 'ai') {
          return new AIMessage(message.content);
        }
        // Default to human message if type is unknown
        return new HumanMessage(message.content);
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  /**
   * Save summary for a chat
   */
  async saveSummary(chatId: number, summary: string): Promise<void> {
    try {
      await this.client.set(this.getSummaryKey(chatId), summary);
    } catch (error) {
      console.error('Error saving summary:', error);
    }
  }

  /**
   * Get summary for a chat
   */
  async getSummary(chatId: number): Promise<string | null> {
    try {
      return await this.client.get(this.getSummaryKey(chatId));
    } catch (error) {
      console.error('Error getting summary:', error);
      return null;
    }
  }

  /**
   * Save memory for a chat
   */
  async saveMemory(chatId: number, memory: string): Promise<void> {
    try {
      await this.client.set(this.getMemoryKey(chatId), memory);
    } catch (error) {
      console.error('Error saving memory:', error);
    }
  }

  /**
   * Get memory for a chat
   */
  async getMemory(chatId: number): Promise<string | null> {
    try {
      return await this.client.get(this.getMemoryKey(chatId));
    } catch (error) {
      console.error('Error getting memory:', error);
      return null;
    }
  }

  /**
   * Get the chat state for a chat
   */
  async getState(chatId: number): Promise<ChatState | null> {
    try {
      const messages = await this.getMessages(chatId);
      if (messages.length === 0) {
        return null;
      }

      const summary = await this.getSummary(chatId);
      const memory = await this.getMemory(chatId);

      return {
        messages,
        summary: summary || undefined,
        memory: memory || undefined,
        chatId,
      };
    } catch (error) {
      console.error('Error getting state:', error);
      return null;
    }
  }

  /**
   * Clear all messages for a chat
   */
  async clearMessages(chatId: number): Promise<void> {
    try {
      await this.client.del(this.getMessagesKey(chatId));
    } catch (error) {
      console.error('Error clearing messages:', error);
    }
  }

  /**
   * Get the current summary countdown value
   */
  async getSummaryCountdown(chatId: number): Promise<number> {
    try {
      const value = await this.client.get(this.getSummaryCountdownKey(chatId));
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      console.error('Error getting summary countdown:', error);
      return 0;
    }
  }

  /**
   * Set the summary countdown value
   */
  async setSummaryCountdown(chatId: number, value: number): Promise<void> {
    try {
      await this.client.set(this.getSummaryCountdownKey(chatId), value.toString());
    } catch (error) {
      console.error('Error setting summary countdown:', error);
    }
  }

  /**
   * Decrement the summary countdown and return the new value
   */
  async decrementSummaryCountdown(chatId: number): Promise<number> {
    try {
      const key = this.getSummaryCountdownKey(chatId);
      const value = await this.client.get(key);
      const currentCount = value ? parseInt(value, 10) : 0;

      if (currentCount <= 0) {
        // Reset to configured value when it reaches 0
        await this.client.set(key, CHAT_CONFIG.summarizeEveryNPairOfMessages.toString());
        return 0;
      } else {
        // Decrement by 1
        const newValue = currentCount - 1;
        await this.client.set(key, newValue.toString());
        return newValue;
      }
    } catch (error) {
      console.error('Error decrementing summary countdown:', error);
      return 0;
    }
  }

  /**
   * Clear all data for a chat (messages, summary, and memory)
   */
  async clearAll(chatId: number): Promise<void> {
    try {
      await Promise.all([
        this.client.del(this.getMessagesKey(chatId)),
        this.client.del(this.getSummaryKey(chatId)),
        this.client.del(this.getMemoryKey(chatId)),
        this.client.del(this.getSummaryCountdownKey(chatId)),
        this.client.del(this.getMemoryCountdownKey(chatId)),
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
}
