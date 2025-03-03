import { SystemMessage } from '@langchain/core/messages';
import { CHAT_CONFIG, summarizeModel } from '../../../config';
import { PROMPTS } from '../../../prompts';
import { RedisService } from '../../../services/redis';
import { MainGraphStateAnnotation } from '../graphs/main.graph';

const redisService = new RedisService();

export const memorizeAgentNode = async (
  state: typeof MainGraphStateAnnotation.State
): Promise<Partial<typeof MainGraphStateAnnotation.State>> => {
  const { messages, chatId, memory: existingMemory } = state;

  // Skip memorization if there are too few messages
  if (messages.length < CHAT_CONFIG.minMessagesBeforeSummary) {
    return {};
  }

  // Check if it's time to run the memorization (countdown = 0)
  if (chatId) {
    const countdown = await redisService.getSummaryCountdown(chatId);
    if (countdown > 0) {
      // Not time to memorize yet
      return {};
    }
  }

  try {
    // Convert messages to string format for the memory agent
    const messagesText = messages
      .slice(-CHAT_CONFIG.summarizeEveryNPairOfMessages * 2 - 2) // Use the last N*2 messages (N Pairs)
      .map((msg) => {
        if (msg.getType() !== 'human' && msg.getType() !== 'ai') return '';

        const role = msg.getType() === 'human' ? 'User' : 'Assistant';
        return `${role}: ${msg.content}`;
      })
      .filter(Boolean)
      .join('\n\n');

    // Create system message with the memory prompt
    const systemMessage = new SystemMessage(PROMPTS.MEMORY.SYSTEM());

    // Format the user prompt with existing memory and new messages
    const userPrompt = PROMPTS.MEMORY.formatUserPrompt(existingMemory, messagesText);

    // Generate the memory
    const response = await summarizeModel.invoke([systemMessage, { role: 'user', content: userPrompt }]);

    const newMemory = response.content.toString();

    // Save the memory to Redis
    if (chatId) {
      await redisService.saveMemory(chatId, newMemory);
    }

    // Return the updated memory
    return {
      memory: newMemory,
    };
  } catch (error) {
    console.error('Error in memorizeAgent:', error);
    return {};
  }
};
