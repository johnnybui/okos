import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ReminderQueueService } from '../../../services/reminderQueue';

/**
 * Tool for setting reminders that will be sent to the user at a specified time
 */
export const setReminderTool = tool(
  async ({ chatId, message, delayMinutes, delayHours, delayDays }) => {
    try {
      // Calculate total delay in milliseconds
      const totalDelayMs =
        (delayMinutes || 0) * 60 * 1000 + (delayHours || 0) * 60 * 60 * 1000 + (delayDays || 0) * 24 * 60 * 60 * 1000;

      if (totalDelayMs <= 0) {
        return 'Error: Please specify a valid delay time greater than 0.';
      }

      // Get the reminder queue service instance
      const reminderQueueService = ReminderQueueService.getInstance();

      // Add the reminder to the queue
      const jobId = await reminderQueueService.addReminder({
        chatId,
        message,
        delayMs: totalDelayMs,
      });

      // Calculate the reminder time for the response
      const reminderTime = new Date(Date.now() + totalDelayMs);
      const formattedTime = reminderTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return `Reminder set successfully! I'll remind you about "${message}" on ${formattedTime}.`;
    } catch (error) {
      if (error instanceof Error) {
        return `Error setting reminder: ${error.message}`;
      }
      return 'An unknown error occurred while setting the reminder.';
    }
  },
  {
    name: 'set_reminder',
    description: 'Set a reminder to be sent to the user after a specified delay.',
    schema: z.object({
      chatId: z.number().describe('The chat ID of the chat where the user are chatting with the you.'),
      message: z.string().describe('The message to send to the user when the reminder is triggered.'),
      delayMinutes: z.number().optional().describe('The number of minutes to wait before sending the reminder.'),
      delayHours: z.number().optional().describe('The number of hours to wait before sending the reminder.'),
      delayDays: z.number().optional().describe('The number of days to wait before sending the reminder.'),
    }),
  }
);
