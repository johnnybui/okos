import { SystemMessage } from '@langchain/core/messages';
import { chatModel } from '../../../config';
import { PROMPTS } from '../../../prompts';
import { MainGraphStateAnnotation, mainTools } from '../graphs/main.graph';

export const responseAgentNode = async (
  state: typeof MainGraphStateAnnotation.State
): Promise<Partial<typeof MainGraphStateAnnotation.State>> => {
  const { messages, chatId, summary, memory } = state;

  const model = chatModel.bindTools(mainTools);

  // Create base system prompt
  let systemPrompt = PROMPTS.CHAT.SYSTEM();

  systemPrompt += `\n\n<additional-context>
Chat ID: ${chatId}`;
  // Add summary if available
  if (summary) {
    systemPrompt += `\n\nConversation Summary:\n${summary}`;
  }

  // Add memory if available
  if (memory) {
    systemPrompt += `\n\nUser Information:\n${memory}`;
  }

  systemPrompt += '\n</additional-context>\n';

  const systemMessage = new SystemMessage(systemPrompt);

  const response = await model.invoke([systemMessage, ...messages]);

  return {
    messages: [response],
  };
};
