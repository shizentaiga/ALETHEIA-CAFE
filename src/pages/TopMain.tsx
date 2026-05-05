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
 * Propsに currentParams を追加し、SearchAreaへ引き継ぎます。
 */
export const TopMain: FC<{ 
  results: any[], 
  total: number, 
  area?: string,
  q?: string,
  currentParams?: URLSearchParams // 💡 URLの状態を丸ごと受け取る
}> = ({ results, total, area, q, currentParams }) => (
  <section class="top-main-container">
    <style>{layoutStyle}</style>  

    {/* Display search chips (Area and Category) */}
    <div class="search-bar-row">
      {/* 💡 SearchArea に currentParams を渡すよう修正 */}
      <SearchArea currentParams={currentParams} />
      
      {/* SearchCategory is currently under development */}
      {/* <SearchCategory /> */}
    </div>

    {/* Search Results Section */}
    <div id="search-result-module">
      <SearchResult results={results} total={total} area={area} q={q} />
    </div>
  </section>
)