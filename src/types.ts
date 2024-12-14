import { Annotation } from '@langchain/langgraph';

export type IChatRole = 'user' | 'assistant' | 'system';

export interface IChatMessage {
  role: IChatRole;
  content: string;
}

export interface IChatState {
  messages: IChatMessage[];
  currentQuestion?: string;
  lastSummary?: string;
}

export interface IChatContext {
  state: IChatState;
  chatId: number;
}

export const ChatContext = Annotation.Root({
  state: Annotation<IChatState>(),
  chatId: Annotation<number>(),
});
