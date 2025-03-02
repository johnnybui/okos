import { AIMessage, BaseMessage, filterMessages } from '@langchain/core/messages';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import TelegramBot from 'node-telegram-bot-api';
import { STICKER } from '../../../config';
import TelegramService from '../../../services/telegram';
import { pickRandomElement } from '../../../utils';
import { memorizeAgentNode } from '../nodes/memorizeAgent.node';
import { responseAgentNode } from '../nodes/responseAgent.node';
import { summarizeAgentNode } from '../nodes/summarizeAgent.node';
import { reminderTool } from '../tools/reminder.tool';
import { searchTool } from '../tools/search.tool';
import { weatherTool } from '../tools/weather.tool';

export const mainTools = [searchTool, weatherTool, reminderTool];
let pendingActionMessage: TelegramBot.Message | undefined;

const getNextRoute = async (state: typeof MainGraphStateAnnotation.State) => {
  const { messages, chatId } = state;
  const aiMessages = filterMessages(messages, { includeTypes: ['ai'] });
  const lastAIMessage = aiMessages[aiMessages.length - 1] as AIMessage;

  if (lastAIMessage?.tool_calls?.length) {
    pendingActionMessage = await TelegramService.sendSticker(chatId, pickRandomElement(STICKER.SEARCHING));
    return 'callTools';
  }

  if (pendingActionMessage) {
    TelegramService.deleteMessage(chatId, pendingActionMessage.message_id);
    pendingActionMessage = undefined;
  }
  return 'end';
};

const summarizeCheckpointNode = async (_state: typeof MainGraphStateAnnotation.State) => {
  return {};
};

export const MainGraphStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (oldMessages, newMessages) => [...oldMessages, ...newMessages],
  }),
  chatId: Annotation<number>(),
  summary: Annotation<string>(),
  memory: Annotation<string>(),
});

export const mainGraph = new StateGraph(MainGraphStateAnnotation)
  .addNode('responseAgent', responseAgentNode)
  .addNode('tools', new ToolNode(mainTools))
  .addNode('summarizeCheckpoint', summarizeCheckpointNode)
  .addNode('summarizeAgent', summarizeAgentNode)
  .addNode('memorizeAgent', memorizeAgentNode)

  .addEdge(START, 'responseAgent')
  .addConditionalEdges('responseAgent', getNextRoute, {
    callTools: 'tools',
    end: 'summarizeCheckpoint',
  })
  .addEdge('tools', 'responseAgent')
  .addEdge('summarizeCheckpoint', 'summarizeAgent')
  .addEdge('summarizeCheckpoint', 'memorizeAgent')
  .addEdge('summarizeAgent', END)
  .addEdge('memorizeAgent', END)

  .compile();
mainGraph.name = 'Main Telegram Bot Graph';
