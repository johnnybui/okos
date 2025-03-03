import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ReminderQueueService } from '../../../services/reminderQueue';
import { formatLocaleDateTime } from '../../../utils';

/**
 * Tool for getting pending reminders for a user
 */
export const getRemindersTools = tool(
  async ({ chatId }) => {
    try {
      // Get the reminder queue service instance
      const reminderQueueService = ReminderQueueService.getInstance();

      // Get pending reminders for the user
      const reminders = await reminderQueueService.getPendingReminders(chatId);

      if (reminders.length === 0) {
        return "You don't have any pending reminders.";
      }

      // Sort reminders by timestamp
      const sortedReminders = reminders.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Format the reminders for display
      const formattedReminders = sortedReminders.map((reminder, index) => {
        const formattedTime = formatLocaleDateTime(reminder.timestamp);

        return `${index + 1}. ID: ${reminder.id}\n   Message: "${reminder.message}"\n   Time: ${formattedTime}`;
      });

      return `You have ${reminders.length} pending reminder${
        reminders.length > 1 ? 's' : ''
      }:\n\n${formattedReminders.join('\n\n')}`;
    } catch (error) {
      if (error instanceof Error) {
        return `Error getting reminders: ${error.message}`;
      }
      return 'An unknown error occurred while getting your reminders.';
    }
  },
  {
    name: 'get_reminders',
    description: 'Get a list of all pending reminders for the user.',
    schema: z.object({
      chatId: z.number().describe('The chat ID of the chat where the user is chatting with you.'),
    }),
  }
);
