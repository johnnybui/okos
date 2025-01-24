import { BraveSearch } from '@langchain/community/tools/brave_search';
import { DuckDuckGoSearch } from '@langchain/community/tools/duckduckgo_search';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

let searchTool: BraveSearch | TavilySearchResults | DuckDuckGoSearch;

switch (process.env.SEARCH_PROVIDER) {
  case 'brave':
    searchTool = new BraveSearch();
    break;
  case 'tavily':
    searchTool = new TavilySearchResults({
      maxResults: Number(process.env.SEARCH_MAX_RESULTS || 3),
    });
    break;
  case 'duckduckgo':
  default:
    searchTool = new DuckDuckGoSearch({ maxResults: Number(process.env.SEARCH_MAX_RESULTS || 3) });
}

export { searchTool };
