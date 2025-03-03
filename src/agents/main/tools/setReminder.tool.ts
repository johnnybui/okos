import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ReminderQueueService } from '../../../services/reminderQueue';
import { formatLocaleDateTime } from '../../../utils';

/**
 * Tool for setting reminders that will be sent to the user at a specified time
 * Supports both relative time (delay) and absolute time specifications
 */
export const setReminderTool = tool(
  async ({ chatId, message, delayMinutes, delayHours, delayDays, targetTime }) => {
    try {
      let totalDelayMs = 0;
      let reminderTime: Date;

      // Handle absolute time if provided
      if (targetTime) {
        const targetDate = new Date(targetTime);

        // Validate the target date
        if (isNaN(targetDate.getTime())) {
          return 'Error: Invalid target time format. Please provide a valid date and time.';
        }

        // Calculate delay from now until target time
        totalDelayMs = Number(targetDate) - Number(new Date());
        reminderTime = targetDate;
      } else {
        // Calculate total delay in milliseconds from relative time parameters
        totalDelayMs =
          (delayMinutes || 0) * 60 * 1000 + (delayHours || 0) * 60 * 60 * 1000 + (delayDays || 0) * 24 * 60 * 60 * 1000;

        // Calculate the reminder time for the response
        reminderTime = new Date(Date.now() + totalDelayMs);
      }

      // Validate the delay
      if (totalDelayMs <= 0) {
        return 'Error: The reminder time must be in the future. Please specify a valid future time.';
      }

      // Get the reminder queue service instance
      const reminderQueueService = ReminderQueueService.getInstance();

      // Add the reminder to the queue
      const jobId = await reminderQueueService.addReminder({
        chatId,
        message,
        delayMs: totalDelayMs,
      });

      // Format the reminder time for the response
      const formattedTime = formatLocaleDateTime(reminderTime);

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
    description:
      'Set a reminder to be sent to the user at a specified time. Supports both relative time (delay from now) and absolute time specifications.',
    schema: z.object({
      chatId: z.number().describe('The chat ID of the chat where the user are chatting with the you.'),
      message: z
        .string()
        .describe(
          'The friendly, chat-like reminder message to the user. Maintain the current conversation style and use suitable emoji.'
        ),
      delayMinutes: z
        .number()
        .optional()
        .describe('The number of minutes to wait before sending the reminder. Use for relative time specifications.'),
      delayHours: z
        .number()
        .optional()
        .describe('The number of hours to wait before sending the reminder. Use for relative time specifications.'),
      delayDays: z
        .number()
        .optional()
        .describe('The number of days to wait before sending the reminder. Use for relative time specifications.'),
      targetTime: z
        .string()
        .optional()
        .describe(
          'The specific date and time to send the reminder (ISO string or any parsable date format). Use for absolute time specifications like "2023-04-15T14:30:00" or "April 15, 2023 14:30".'
        ),
    }),
  }
);
