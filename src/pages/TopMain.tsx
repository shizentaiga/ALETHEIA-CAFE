import type { FC } from 'hono/jsx'
import { SearchArea } from '../components/SearchArea'
import { SearchCategory } from '../components/SearchCategory'
import { SearchResult } from '../components/SearchResult'

/**
 * 【Design Settings】
 * デザイナー向け：レイアウトに関するCSSはここを編集してください。
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

/**
 * HTMX実装時の鉄則:
 * 1. 責務分離: TopMainは「配置」のみ。HTMXのターゲットID(#search-results-target)は各Component内に隠蔽する。
 * 2. ID固定: 検索結果の差し替え先IDを固定し、HTMXのレスポンス（HTML断片）と密結合させる。
 * 3. 疎結合: 検索条件(Area/Category)の変更は、hidden input経由またはhx-includeでSearchResultへ伝播させる。
 * 4. JS管理: 要素差し替えでJSが消えるのを防ぐため、イベントはdocument等へのデリゲーションを推奨。
 */
export const TopMain: FC = () => (
  <section class="top-main-container">
    {/* CSS適用 */}
    <style>{layoutStyle}</style>

    {/* メインコンテンツ1: エリア検索（独立コンポーネント） */}
    <div class="main-content-1">
      <SearchArea />
    </div>

    {/* メインコンテンツ2: カテゴリ検索 */}
    <div class="main-content-2">
      <SearchCategory />
    </div>

    {/* メインコンテンツ3: 検索結果 */}
    <div class="main-content-3">
      <SearchResult />
    </div>
  </section>
)