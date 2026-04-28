import type { FC } from 'hono/jsx'
import { SearchArea } from '../components/SearchArea'
import { SearchCategory } from '../components/SearchCategory'
import { SearchResult } from '../components/SearchResult'

const layoutStyle = `
  .top-main-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  /* エリアと絞り込みを横に並べる */
  .search-bar-row {
    display: flex;
    gap: 12px;
    width: 100%;
  }
  .search-bar-row > div {
    flex: 1; /* 50%ずつ均等に広げる */
  }
`

export const TopMain: FC<{ results: any[], total: number }> = ({ results, total }) => (
  <section class="top-main-container">
    <style>{layoutStyle}</style>  

    {/* 上段：2つのチップを横並びに配置 */}
    <div class="search-bar-row">
      <SearchArea />
      <SearchCategory />
    </div>

    {/* 下段：検索結果 */}
    <div id="search-result-module">
      <SearchResult results={results} total={total} />
    </div>
  </section>
)