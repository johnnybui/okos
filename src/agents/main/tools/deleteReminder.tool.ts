import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ReminderQueueService } from '../../../services/reminderQueue';

/**
 * Tool for deleting a specific reminder
 */
export const deleteReminderTool = tool(
  async ({ chatId, reminderId }) => {
    try {
      // Get the reminder queue service instance
      const reminderQueueService = ReminderQueueService.getInstance();
      
      // First, verify that the reminder belongs to this user
      const reminders = await reminderQueueService.getPendingReminders(chatId);
      const reminderExists = reminders.some(reminder => reminder.id === reminderId);
      
      if (!reminderExists) {
        return `No reminder with ID "${reminderId}" was found for you. Please check the ID and try again.`;
      }
      
      // Delete the reminder
      const success = await reminderQueueService.deleteReminder(reminderId);
      
      if (success) {
        return `Reminder with ID "${reminderId}" has been successfully deleted.`;
      } else {
        return `Failed to delete reminder with ID "${reminderId}". The reminder may have already been processed or deleted.`;
      }
    } catch (error) {
      if (error instanceof Error) {
        return `Error deleting reminder: ${error.message}`;
      }
      return 'An unknown error occurred while deleting the reminder.';
    }
  },
  {
    name: 'delete_reminder',
    description: 'Delete a specific reminder by its ID.',
    schema: z.object({
      chatId: z.number().describe('The chat ID of the chat where the user is chatting with you.'),
      reminderId: z.string().describe('The ID of the reminder to delete.'),
    }),
  }
);
