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
  .search-bar-row {
    display: flex;
    gap: 12px;
    width: 100%;
  }
  /* 直下の全要素を均等(1:1)に並べる。これが最も不具合が起きにくい指定です */
  .search-bar-row > * {
    flex: 1;
  }
`

export const TopMain: FC<{ results: any[], total: number }> = ({ results, total }) => (
  <section class="top-main-container">
    <style>{layoutStyle}</style>  

    {/* シンプルに2つのチップを並べる */}
    <div class="search-bar-row">
      <SearchArea />
      {/* SearchCategoryは一時的に開発停止 */}
      {/* <SearchCategory /> */}
    </div>

    {/* 検索結果 */}
    <div id="search-result-module">
      <SearchResult results={results} total={total} />
    </div>
  </section>
)