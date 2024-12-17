import { BraveSearch } from '@langchain/community/tools/brave_search';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import dotenv from 'dotenv';

dotenv.config();

export const searchTool =
  process.env.SEARCH_PROVIDER === 'brave'
    ? new BraveSearch()
    : new TavilySearchResults({
        maxResults: 2,
      });
