import { Annotation } from '@langchain/langgraph';
import { z } from 'zod';

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
  searchNeeded?: boolean;
  searchQuery?: string;
  searchResults?: string[];
  thingsDone?: string[];
}

export const ChatContext = Annotation.Root({
  state: Annotation<IChatState>(),
  chatId: Annotation<number>(),
  searchNeeded: Annotation<boolean>(),
  searchQuery: Annotation<string>(),
  searchResults: Annotation<string[]>(),
  thingsDone: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
});

export const ChatClassifierSchema = z.object({
  searchNeeded: z.boolean().describe('Whether a internet search is needed to answer this question'),
  searchQuery: z.string().optional().describe('The query that will be used to search'),
});
