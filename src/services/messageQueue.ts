import { Queue, Worker } from 'bullmq';
import { QUEUE_CONFIG } from '../config';
import { RedisService } from './redis';

// Message types
export type MessagePayload = {
  chatId: number;
  type: 'text' | 'photo' | 'sticker';
  content: string | PhotoContent;
};

export type PhotoContent = {
  photos: any[];
  caption?: string;
};

// Singleton Queue Service
export class MessageQueueService {
  private static instance: MessageQueueService;
  private redisConnection: any;
  private queues: Map<number, Queue>;
  private workers: Map<number, Worker>;
  private messageProcessor: ((payload: MessagePayload) => Promise<void>) | null = null;

  private constructor() {
    // Get Redis connection from RedisService
    this.redisConnection = RedisService.getBullMQConnection();

    // Initialize maps for queues and workers
    this.queues = new Map();
    this.workers = new Map();
  }

  public static getInstance(): MessageQueueService {
    if (!MessageQueueService.instance) {
      MessageQueueService.instance = new MessageQueueService();
    }
    return MessageQueueService.instance;
  }

  /**
   * Get or create a queue for a specific chatId
   * @param chatId The chat ID to get or create a queue for
   * @returns The queue for the specified chatId
   */
  private getOrCreateQueueForChatId(chatId: number): Queue {
    // Check if queue already exists for this chatId
    if (!this.queues.has(chatId)) {
      const queueName = `message-queue-${chatId}`;

      // Create queue
      const queue = new Queue(queueName, {
        connection: this.redisConnection,
      });

      queue.setGlobalConcurrency(QUEUE_CONFIG.maxJobsPerUser);
      this.queues.set(chatId, queue);

      // Create worker if callback is set
      if (this.messageProcessor) {
        const worker = new Worker(
          queueName,
          async (job) => {
            const payload = job.data as MessagePayload;
            await this.messageProcessor!(payload);
          },
          {
            connection: this.redisConnection,
            limiter: {
              max: QUEUE_CONFIG.jobsPer5Seconds,
              duration: 5000,
            },
          }
        );

        // Set up worker event handlers
        worker.on('completed', ({ id }) => {
          if (process.env.ENV === 'debug') {
            console.log(`Job ${id} for chat ${chatId} completed`);
          }
        });

        worker.on('failed', (job, error) => {
          console.error(`Job ${job?.id} for chat ${chatId} failed: ${error}`);
        });

        worker.on('stalled', (id) => {
          console.warn(`Job ${id} for chat ${chatId} stalled`);
        });

        this.workers.set(chatId, worker);
      }
    }

    return this.queues.get(chatId)!;
  }

  /**
   * Register the message processing function that will be used by all workers
   *
   * This method doesn't create any workers immediately. Instead, it stores the
   * message processing function that will be used later when workers are created
   * dynamically for each chat ID.
   *
   * @param messageProcessor The function that processes messages from the queue
   */
  public registerMessageProcessor(messageProcessor: (payload: MessagePayload) => Promise<void>): void {
    this.messageProcessor = messageProcessor;
  }

  /**
   * Add a message (job) to the queue
   */
  public async addMessage(payload: MessagePayload): Promise<string> {
    const { chatId } = payload;
    const jobId = `${chatId}-${payload.type}-${Date.now()}`;

    // Get or create queue for this chatId
    const queue = this.getOrCreateQueueForChatId(chatId);

    // Add job to the queue
    await queue.add('process-message', payload, {
      jobId,
      removeOnComplete: QUEUE_CONFIG.removeOnComplete,
      removeOnFail: QUEUE_CONFIG.removeOnFail,
      attempts: QUEUE_CONFIG.retryAttempts,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });

    return jobId;
  }

  /**
   * Close all queue and worker connections
   */
  public async close(): Promise<void> {
    // Close all workers
    const workerPromises = Array.from(this.workers.values()).map((worker) => worker.close());
    await Promise.all(workerPromises);

    // Close all queues
    const queuePromises = Array.from(this.queues.values()).map((queue) => queue.close());
    await Promise.all(queuePromises);
  }
}

export default MessageQueueService;
