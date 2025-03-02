import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ReminderQueueService } from '../../../services/reminderQueue';

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
        const formattedTime = reminder.timestamp.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'shortOffset',
        });

        return `${index + 1}. Time: ${formattedTime}\n   Message: "${reminder.message}"`;
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
