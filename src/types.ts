import { Annotation } from '@langchain/langgraph';

export type IChatRole = 'user' | 'assistant' | 'system';

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface IChatState {
  messages: IChatMessage[];
  currentQuestion?: string;
  lastSummary?: string;
  memory?: string;
}

export interface IChatContext {
  state?: IChatState;
  chatId?: number;
  thingsDone?: string[];
}

export const ChatContext = Annotation.Root({
  state: Annotation<IChatState>(),
  chatId: Annotation<number>(),
  thingsDone: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
});
