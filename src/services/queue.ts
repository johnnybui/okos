import { Queue, QueueEvents, Worker } from 'bullmq';
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
export class QueueService {
  private static instance: QueueService;
  private messageQueue: Queue;
  private worker: Worker | undefined;
  private queueEvents: QueueEvents;
  private redisConnection: any;

  private constructor() {
    // Get Redis connection from RedisService
    this.redisConnection = RedisService.getBullMQConnection();

    // Create message queue
    this.messageQueue = new Queue('message-queue', {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: QUEUE_CONFIG.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: QUEUE_CONFIG.removeOnComplete,
        removeOnFail: QUEUE_CONFIG.removeOnFail,
      },
      limiter: {
        groupKey: 'chatId',
      },
    });

    // Create queue events
    this.queueEvents = new QueueEvents('message-queue', {
      connection: this.redisConnection,
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Add a message to the queue
   */
  public async addMessage(payload: MessagePayload): Promise<string> {
    const jobId = `${payload.chatId}-${Date.now()}`;
    await this.messageQueue.add('process-message', payload, {
      jobId,
    });
    return jobId;
  }

  /**
   * Set up the worker to process messages
   * @param processCallback The function to call when processing a message
   */
  public setupWorker(processCallback: (payload: MessagePayload) => Promise<void>): void {
    // Create worker
    this.worker = new Worker(
      'message-queue',
      async (job) => {
        const payload = job.data as MessagePayload;
        await processCallback(payload);
      },
      {
        connection: this.redisConnection,
        concurrency: QUEUE_CONFIG.concurrency,
        limiter: {
          max: QUEUE_CONFIG.maxJobsPerUser,
          duration: 5000 / QUEUE_CONFIG.jobsPer5Seconds,
          groupKey: 'chatId',
        },
      }
    );
  }

  /**
   * Set up event listeners for the queue
   */
  private setupEventListeners(): void {
    this.queueEvents.on('completed', ({ jobId }) => {
      if (process.env.ENV === 'debug') {
        console.log(`Job ${jobId} completed`);
      }
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`Job ${jobId} failed: ${failedReason}`);
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      console.warn(`Job ${jobId} stalled`);
    });
  }

  /**
   * Close the queue and worker connections
   */
  public async close(): Promise<void> {
    await this.worker?.close();
    await this.messageQueue.close();
    await this.queueEvents.close();
  }
}

export default QueueService;
