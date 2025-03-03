import { SystemMessage } from '@langchain/core/messages';
import { CHAT_CONFIG, summarizeModel } from '../../../config';
import { PROMPTS } from '../../../prompts';
import { RedisService } from '../../../services/redis';
import { MainGraphStateAnnotation } from '../graphs/main.graph';

const redisService = new RedisService();

export const summarizeAgentNode = async (
  state: typeof MainGraphStateAnnotation.State
): Promise<Partial<typeof MainGraphStateAnnotation.State>> => {
  const { messages, chatId, summary: previousSummary } = state;

  // Skip summarization if there are too few messages
  if (messages.length < CHAT_CONFIG.minMessagesBeforeSummary) {
    return {};
  }

  // Check if it's time to run the summarization (countdown = 0)
  if (chatId) {
    const countdown = await redisService.getSummaryCountdown(chatId);
    if (countdown > 0) {
      // Not time to summarize yet
      return {};
    }
  }

  try {
    // Convert messages to string format for the summarizer
    const messagesText = messages
      .slice(-CHAT_CONFIG.summarizeEveryNPairOfMessages * 2 - 2) // Use the last N*2 messages (N Pairs)
      .map((msg) => {
        if (msg.getType() !== 'human' && msg.getType() !== 'ai') return '';

        const role = msg.getType() === 'human' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .filter(Boolean)
      .join('\n\n');

    // Create system message with the summary prompt
    const systemMessage = new SystemMessage(PROMPTS.SUMMARY.SYSTEM());

    // Format the user prompt with previous summary and new messages
    const userPrompt = PROMPTS.SUMMARY.formatUserPrompt(previousSummary, messagesText);

    // Generate the summary
    const response = await summarizeModel.invoke([systemMessage, { role: 'user', content: userPrompt }]);

    const newSummary = response.content.toString();

    // Save the summary to Redis
    if (chatId) {
      await redisService.saveSummary(chatId, newSummary);
    }

    // Return the updated summary
    return {
      summary: newSummary,
    };
  } catch (error) {
    console.error('Error in summarizeAgent:', error);
    return {};
  }
};
