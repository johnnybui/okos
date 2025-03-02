import { Queue, Worker } from 'bullmq';
import { QUEUE_CONFIG } from '../config';
import { RedisService } from './redis';
import TelegramService from './telegram';

// Reminder payload type
export type ReminderPayload = {
  chatId: number;
  message: string;
  delayMs: number;
};

// Singleton Reminder Queue Service
export class ReminderQueueService {
  private static instance: ReminderQueueService;
  private redisConnection: any;
  private queue: Queue;
  private worker: Worker;

  private constructor() {
    // Get Redis connection from RedisService
    this.redisConnection = RedisService.getBullMQConnection();

    // Create reminder queue
    this.queue = new Queue('reminder-queue', {
      connection: this.redisConnection,
    });

    // Create worker for processing reminders
    this.worker = new Worker(
      'reminder-queue',
      async (job) => {
        const payload = job.data as ReminderPayload;
        await this.processReminder(payload);
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
    this.worker.on('completed', ({ id }) => {
      if (process.env.ENV === 'debug') {
        console.log(`Reminder job ${id} completed`);
      }
    });

    this.worker.on('failed', (job, error) => {
      console.error(`Reminder job ${job?.id} failed: ${error}`);
    });

    this.worker.on('stalled', (id) => {
      console.warn(`Reminder job ${id} stalled`);
    });
  }

  public static getInstance(): ReminderQueueService {
    if (!ReminderQueueService.instance) {
      ReminderQueueService.instance = new ReminderQueueService();
    }
    return ReminderQueueService.instance;
  }

  /**
   * Process a reminder by sending a message to the user
   */
  private async processReminder(payload: ReminderPayload): Promise<void> {
    const { chatId, message } = payload;

    try {
      // Send reminder message to the user
      await TelegramService.sendMessage(chatId, message);

      if (process.env.ENV === 'debug') {
        console.log(`Sent reminder to chat ${chatId}: ${message}`);
      }
    } catch (error) {
      console.error(`Failed to send reminder to chat ${chatId}: ${error}`);
      throw error; // Re-throw to trigger BullMQ retry mechanism
    }
  }

  /**
   * Add a reminder to the queue
   */
  public async addReminder(payload: ReminderPayload): Promise<string> {
    const { chatId, delayMs } = payload;
    const jobId = `reminder-${chatId}-${Date.now()}`;

    // Add job to the queue with delay
    await this.queue.add('process-reminder', payload, {
      jobId,
      delay: delayMs,
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
   * Close queue and worker connections
   */
  public async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}

export default ReminderQueueService;
