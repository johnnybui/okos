import { BaseMessage, isAIMessage } from '@langchain/core/messages';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import TelegramBot from 'node-telegram-bot-api';
import { redisService, STICKER } from '../../../config';
import TelegramService from '../../../services/telegram';
import { pickRandomElement } from '../../../utils';
import { memorizeAgentNode } from '../nodes/memorizeAgent.node';
import { responseAgentNode } from '../nodes/responseAgent.node';
import { summarizeAgentNode } from '../nodes/summarizeAgent.node';
import { deleteReminderTool } from '../tools/deleteReminder.tool';
import { getRemindersTools } from '../tools/getReminders.tool';
import { searchTool } from '../tools/search.tool';
import { setReminderTool } from '../tools/setReminder.tool';
import { weatherTool } from '../tools/weather.tool';

export const mainTools = [searchTool, weatherTool, setReminderTool, getRemindersTools, deleteReminderTool];
let pendingActionMessage: TelegramBot.Message | undefined;

const getNextRoute = async (state: typeof MainGraphStateAnnotation.State) => {
  const { messages, chatId } = state;

  const lastMessage = messages[messages.length - 1];
  if (!isAIMessage(lastMessage)) return 'end';

  if (lastMessage?.tool_calls?.length) {
    let midWorkflowResponse: string | undefined;

    // Parse the AI message for both text and complex array to send mid workflow response
    if (typeof lastMessage.content === 'string') {
      midWorkflowResponse = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      midWorkflowResponse = (lastMessage.content as any[]).filter((c) => c.type === 'text')[0]?.text ?? undefined;
    }

    if (midWorkflowResponse) {
      await redisService.saveAIMessage(chatId, midWorkflowResponse);
      await TelegramService.sendMessage(chatId, midWorkflowResponse);
      TelegramService.sendChatAction(chatId, 'typing');
    }

    // Send mid workflow state sticker
    let stateSticker = pickRandomElement(STICKER.WRITING);
    if (lastMessage.tool_calls[0].name.includes('search')) {
      stateSticker = pickRandomElement(STICKER.SEARCHING);
    }
    if (lastMessage.tool_calls[0].name.includes('weather')) {
      stateSticker = pickRandomElement(STICKER.SEARCHING);
    }
    if (
      lastMessage.tool_calls[0].name.includes('set_reminder') ||
      lastMessage.tool_calls[0].name.includes('get_reminders') ||
      lastMessage.tool_calls[0].name.includes('delete_reminder')
    ) {
      stateSticker = pickRandomElement(STICKER.WRITING);
    }

    if (pendingActionMessage) {
      TelegramService.deleteMessage(chatId, pendingActionMessage.message_id);
      pendingActionMessage = undefined;
    }
    pendingActionMessage = await TelegramService.sendSticker(chatId, stateSticker);
    TelegramService.sendChatAction(chatId, 'typing');

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
