import { BraveSearch } from '@langchain/community/tools/brave_search';
import { DuckDuckGoSearch } from '@langchain/community/tools/duckduckgo_search';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import dotenv from 'dotenv';

dotenv.config();

let searchTool: BraveSearch | TavilySearchResults | DuckDuckGoSearch;

switch (process.env.SEARCH_PROVIDER) {
  case 'brave':
    searchTool = new BraveSearch();
    break;
  case 'tavily':
    searchTool = new TavilySearchResults({
      maxResults: 3,
    });
    break;
  case 'duckduckgo':
  default:
    searchTool = new DuckDuckGoSearch({ maxResults: 3 });
}

export { searchTool };
