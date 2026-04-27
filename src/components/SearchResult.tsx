import { html } from 'hono/html'
import type { FC } from 'hono/jsx'

/**
 * 【Design Settings】
 * デザイナー向け：結果リストおよびカードの見た目はここを編集してください。
 */
const moduleStyle = (scope: string) => `
  #${scope} { margin-top: 10px; }
  #${scope} .result-header { font-size: 0.8rem; color: #666; margin-bottom: 8px; }
  
  /* 差し替えターゲットの外枠（HTMXで中身が入れ替わる） */
  #search-results-target { display: flex; flex-direction: column; gap: 8px; }

  /* カードの最小スタイル */
  #${scope} .cafe-card {
    display: block; text-decoration: none; color: inherit;
    padding: 16px; border: 1px solid #eee; border-radius: 10px;
    background: #fff; transition: background 0.2s;
  }
  #${scope} .cafe-card:hover { background: #fafafa; border-color: #ddd; }
  #${scope} .name { font-weight: 700; display: block; }
  #${scope} .addr { font-size: 0.75rem; color: #888; }
`

/**
 * 【Content & Data Settings】
 */
const LABELS = {
  resultPrefix: "検索結果:"
}

// DB(D1)から取得を想定している検索結果のモックデータ
const MOCK_RESULTS = [
  { id: 1, name: "☕ テストカフェ小岩", address: "東京都江戸川区..." },
  { id: 2, name: "☕ サンプルコーヒー葛西", address: "東京都江戸川区..." }
]

export const SearchResult: FC = () => {
  const scope = "search-result-module"

  return (
    <section id={scope}>
      <style>{moduleStyle(scope)}</style>

      {/* 件数表示 */}
      <div class="result-header">
        {LABELS.resultPrefix} {MOCK_RESULTS.length}件
      </div>

      {/* HTMXはこの div の中身(innerHTML)だけを書き換える */}
      <div id="search-results-target">
        {MOCK_RESULTS.map(cafe => (
          <a href={`/cafe/${cafe.id}`} class="cafe-card">
            <span class="name">{cafe.name}</span>
            <span class="addr">{cafe.address}</span>
          </a>
        ))}
      </div>

      {html`
        <script>
          // 将来的にはここで「無限スクロール」や「画像の遅延読み込み」を制御
          console.log("SearchResult module loaded with ${MOCK_RESULTS.length} items");
        </script>
      `}
    </section>
  )
}