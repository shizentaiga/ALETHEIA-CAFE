/**
 * [File Path] src/_sandbox/test06_keyword.tsx
 * [Role] Sandbox for multi-keyword chip search with HTMX.
 */
import { Hono } from 'hono'

export const test06 = new Hono()

const MOCK_DATA = [
  { id: 1, name: '東京 恵比寿 カフェ' },
  { id: 2, name: '東京 渋谷 ラーメン' },
  { id: 3, name: '大阪 梅田 カフェ' },
  { id: 4, name: '東京 恵比寿 ラーメン' },
]

const style = `
  .container { max-width: 600px; margin: 20px auto; font-family: sans-serif; }
  .search-box { display: flex; flex-wrap: wrap; gap: 8px; border: 2px solid #3b82f6; padding: 8px; border-radius: 20px; background: #fff; align-items: center; }
  .chip { background: #eff6ff; padding: 4px 10px; border-radius: 16px; display: flex; align-items: center; font-size: 0.9rem; border: 1px solid #bfdbfe; }
  .chip a { margin-left: 6px; color: #ef4444; text-decoration: none; font-weight: bold; cursor: pointer; }
  .input { border: none; outline: none; flex: 1; min-width: 120px; font-size: 1rem; padding: 4px; }
  .section { margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
  .result-item { padding: 5px 0; border-bottom: 1px solid #eee; }
  .result-item:last-child { border-bottom: none; }
`

test06.get('/', (c) => {
  // --- クエリ取得 ---
  const rawQs = c.req.queries('q') || []

  // --- 分解 & 正規化 ---
  const keywords = [
    ...new Set(
      rawQs
        .flatMap(v => v.split(/[\s　]+/))
        .map(v => v.trim())
        .filter(Boolean)
    )
  ]

  // --- 検索ロジック ---
  let results: typeof MOCK_DATA = []

  if (keywords.length > 0) {
    results = MOCK_DATA.filter(item =>
      keywords.every(kw => item.name.includes(kw))
    )
  }

  return c.render(
    <div id="app">
      <style>{style}</style>

      <div class="container">
        {/* 
          [Fix] hx-get を空にする（または "./"）
          これにより、現在のパス（/_sandbox/test06）に対してリクエストが飛びます
        */}
        <form
          hx-get=""
          hx-target="#app"
          hx-select="#app"
          hx-push-url="true"
        >
          <div class="search-box">
            {/* 確定済みキーワードをチップとして表示 */}
            {keywords.map((kw, i) => {
              const newQs = keywords.filter((_, idx) => idx !== i)
              const params = new URLSearchParams()
              newQs.forEach(k => params.append('q', k))

              return (
                <span class="chip">
                  {kw}
                  <a
                    hx-get={`?${params.toString()}`}
                    hx-target="#app"
                    hx-select="#app"
                    hx-push-url="true"
                  >
                    ×
                  </a>
                  {/* フォーム送信時に既存のキーワードを維持するための隠しフィールド */}
                  <input type="hidden" name="q" value={kw} />
                </span>
              )
            })}

            {/* 新規入力フィールド */}
            <input
              id="q-input"
              class="input"
              name="q"
              placeholder={keywords.length > 0 ? "追加.." : "例：東京 恵比寿"}
              autocomplete="off"
              /* 送信後に入力欄をクリアするスクリプト */
              hx-on="htmx:afterRequest: this.value = ''"
            />

            <button type="submit" style="cursor:pointer;">検索</button>
          </div>
        </form>

        {/* 状態表示 */}
        <div class="section">
          <strong>現在の条件:</strong> {keywords.length > 0 ? keywords.join(' + ') : 'なし'}
        </div>

        {/* 検索結果 */}
        <div class="section">
          <strong>検索結果 ({results.length}件)</strong>

          {keywords.length === 0 ? (
            <p style="color: #666;">キーワードを入力して検索してください</p>
          ) : results.length === 0 ? (
            <p style="color: #ef4444;">該当するデータが見つかりませんでした</p>
          ) : (
            <div style="margin-top: 10px;">
              {results.map(r => (
                <div class="result-item">{r.name}</div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
})