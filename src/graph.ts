import { END, START, StateGraph } from '@langchain/langgraph';
import { classifyUserInputAgent } from './agents/classifyUserInput.agent';
import { generateMemoryAgent } from './agents/generateMemory.agent';
import { generateResponseAgent } from './agents/generateResponse.agent';
import { generateSummaryAgent } from './agents/generateSummary.agent';
import { performSearchAgent } from './agents/performSearch.agent';
import { processUserInputAgent } from './agents/processUserInput.agent';
import { ChatContext } from './types';

const checkSearchNeeded = (context: typeof ChatContext.State): 'searchNeeded' | 'searchNotNeeded' => {
  return context.searchNeeded ? 'searchNeeded' : 'searchNotNeeded';
};

export const createChatGraph = () => {
  const graph = new StateGraph(ChatContext)
    .addNode('processUserInputAgent', processUserInputAgent)
    .addNode('classifyUserInputAgent', classifyUserInputAgent)
    .addNode('performSearchAgent', performSearchAgent)
    .addNode('generateResponseAgent', generateResponseAgent)
    .addNode('generateSummaryAgent', generateSummaryAgent)
    .addNode('generateMemoryAgent', generateMemoryAgent)

    .addEdge(START, 'processUserInputAgent')
    .addEdge('processUserInputAgent', 'classifyUserInputAgent')

    .addConditionalEdges('classifyUserInputAgent', checkSearchNeeded, {
      searchNeeded: 'performSearchAgent',
      searchNotNeeded: 'generateResponseAgent',
    })

    .addEdge('performSearchAgent', 'generateResponseAgent')
    .addEdge('generateResponseAgent', 'generateSummaryAgent')
    .addEdge('generateResponseAgent', 'generateMemoryAgent')
    .addEdge('generateSummaryAgent', END)
    .addEdge('generateMemoryAgent', END);

  return graph.compile();
};
