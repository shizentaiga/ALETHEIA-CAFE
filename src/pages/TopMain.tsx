/**
 * HTMX実装時の鉄則: 
 * TopMainは配置に徹し、固定IDを介したコンポーネント完結の更新と疎結合なデータ伝播を徹底
 */

import type { FC } from 'hono/jsx'
import { SearchArea } from '../components/SearchArea'
import { SearchCategory } from '../components/SearchCategory'
import { SearchResult } from '../components/SearchResult'

/**
 * 【Design Settings】
 */
const layoutStyle = `
  .top-main-container {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  .main-content-1, .main-content-2, .main-content-3 {
    width: 100%;
  }
`

export const TopMain: FC<{ results: any[], total: number }> = ({ results, total }) => (
  <section class="top-main-container">
    
    {/* CSS適用 */}
    <style>{layoutStyle}</style>  

    {/* エリア検索 */}
    <div class="main-content-1"><SearchArea /></div> 

    {/* カテゴリ検索 */}
    <div class="main-content-2"><SearchCategory /></div>

    {/* 検索結果 */}
    <div class="main-content-3">
      <SearchResult results={results} total={total} />
    </div>
  </section>
)