import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import dotenv from 'dotenv';

dotenv.config();

export const searchTool = new TavilySearchResults({
  maxResults: 2,
});
