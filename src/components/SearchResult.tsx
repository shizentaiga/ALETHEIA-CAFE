import { html } from 'hono/html'
import type { FC } from 'hono/jsx'
import { formatAttributes } from '../db/queries/main'

/**
 * 【Design Settings】
 */
const moduleStyle = (scope: string) => `
  #${scope} { margin-top: 10px; }
  #${scope} .result-header { font-size: 0.8rem; color: #666; margin-bottom: 8px; }
  #search-results-target { display: flex; flex-direction: column; gap: 8px; }
  #${scope} .cafe-card {
    display: block; text-decoration: none; color: inherit;
    padding: 16px; border: 1px solid #eee; border-radius: 10px;
    background: #fff; transition: background 0.2s;
  }
  #${scope} .cafe-card:hover { background: #fafafa; border-color: #ddd; }
  #${scope} .name { font-weight: 700; display: block; }
  #${scope} .addr { font-size: 0.75rem; color: #888; }
  /* タグ用の最小スタイルを追加 */
  .tag-box { display: flex; gap: 4px; margin-top: 4px; }
  .tag { font-size: 0.65rem; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; color: #64748b; }
`

const LABELS = {
  resultPrefix: "検索結果:"
}

export const SearchResult: FC<{ results: any[], total: number }> = ({ results, total }) => {
  const scope = "search-result-module"

  return (
    <section id={scope}>
      <style>{moduleStyle(scope)}</style>
      <div class="result-header">{LABELS.resultPrefix} {total}件</div>

      <div id="search-results-target">
        {results.map(row => (
          <a href={`/cafe/${row.service_id}`} class="cafe-card">
            <span class="name">{row.title}</span>
            <span class="addr">{row.address}</span>
            {/* 2. タグ表示の追加（ここだけ） */}
            <div class="tag-box">
              {formatAttributes(row.attributes_json).map(tag => (
                <span class="tag">{tag}</span>
              ))}
            </div>
          </a>
        ))}
      </div>

      {html`<script></script>`}
    </section>
  )
}