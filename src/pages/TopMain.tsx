import type { FC } from 'hono/jsx'
import { SearchArea } from '../components/SearchArea'
import { SearchCategory } from '../components/SearchCategory'
import { SearchResult } from '../components/SearchResult'

/**
 * [Design Settings]
 * Layout for the main content area.
 */
const layoutStyle = `
  .top-main-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  .search-bar-row {
    display: flex;
    gap: 12px;
    width: 100%;
  }
  /* Make all children equal width (1:1). This is the most stable way to align them. */
  .search-bar-row > * {
    flex: 1;
  }
`

/**
 * TopMain Component
 * We add 'area' to props to pass the state to SearchResult.
 */
export const TopMain: FC<{ 
  results: any[], 
  total: number, 
  area?: string // Added to maintain area state
}> = ({ results, total, area }) => (
  <section class="top-main-container">
    <style>{layoutStyle}</style>  

    {/* Display search chips (Area and Category) */}
    <div class="search-bar-row">
      <SearchArea currentArea={area} />
      
      {/* SearchCategory is currently under development */}
      {/* <SearchCategory /> */}
    </div>

    {/* Search Results Section */}
    <div id="search-result-module">
      {/* 
        Pass the 'area' from the URL parameter to SearchResult.
        This ensures the hidden input field is correctly set on page reload.
      */}
      <SearchResult results={results} total={total} area={area} />
    </div>
  </section>
)