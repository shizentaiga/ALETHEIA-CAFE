/**
 * [File Path] src/components/SearchResult.tsx
 * [Role] UI component to display search results and sync input state.
 */
import { html } from 'hono/html'
import type { FC } from 'hono/jsx'
import { formatAttributes } from '../db/queries/main'

// --- Types ---
export interface ServiceResult {
  service_id: string;
  title: string;
  address: string;
  attributes_json: string;
}

export interface SearchResultProps {
  results: ServiceResult[];
  total: number;
  area?: string;
  q?: string; // Normalized query from server
}

// --- Styles ---
const moduleStyle = (scope: string) => `
  #${scope} { margin-top: 10px; }
  #${scope} .result-header { font-size: 0.8rem; color: #555; margin-bottom: 8px; }
  #search-results-target { display: flex; flex-direction: column; gap: 8px; }
  #${scope} .cafe-card {
    display: block; text-decoration: none; color: inherit;
    padding: 16px; border: 1px solid #eee; border-radius: 10px;
    background: #fff; transition: background 0.2s;
  }
  #${scope} .cafe-card:hover { background: #fafafa; border-color: #ddd; }
  #${scope} .name { font-weight: 700; display: block; color: #111; }
  #${scope} .addr { font-size: 0.75rem; color: #555; line-height: 1.4; display: block; }
  .tag-box { display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap; }
  .tag { font-size: 0.65rem; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; color: #334155; font-weight: 500; }
`

const LABELS = {
  resultPrefix: "検索結果:"
}

/**
 * SearchResult Component
 */
export const SearchResult: FC<SearchResultProps> = ({ results, total, area = '', q = '' }) => {
  const scope = "search-result-module"

  return (
    <section id={scope}>
      {/* State management for HTMX */}
      <input type="hidden" id="current-area-state" name="area" value={area} />
      
      <style>{moduleStyle(scope)}</style>
      <div class="result-header">{LABELS.resultPrefix} {total}件</div>

      <div id="search-results-target">
        {results.map(row => (
          <a class="cafe-card">
            <span class="name">{row.title}</span>
            <span class="addr">{row.address}</span>
            <div class="tag-box">
              {formatAttributes(row.attributes_json).map(tag => (
                <span class="tag">{tag}</span>
              ))}
            </div>
          </a>
        ))}
      </div>

      {/* 
        Sync the search input value with the normalized query.
        This ensures "word word" becomes "word" in the UI after search.
      */}
      {html`
        <script>
          (function() {
            const q = "${q}";
            const searchInput = document.getElementById('q-input-header');
            if (!searchInput) return;

            const wrapper = searchInput.parentElement;
            
            // 1. 既存のチップをクリア (inputとbutton以外の.search-chipを削除)
            const oldChips = wrapper.querySelectorAll('.search-chip');
            oldChips.forEach(chip => chip.remove());

            // 2. 正規化されたクエリがある場合、チップを再生成して挿入
            if (q) {
              const keywords = q.split(/[\\s　]+/).filter(Boolean);
              keywords.forEach(word => {
                const span = document.createElement('span');
                span.className = 'search-chip';
                span.innerText = word;
                // input要素の直前に挿入することで、チップ -> 入力欄 の並びを維持
                wrapper.insertBefore(span, searchInput);
              });
            }

            // 3. 入力欄を空にする
            // 確定したキーワードはチップ化されたので、inputは次の入力待ち状態にする
            searchInput.value = "";
            
            // 4. プレースホルダーの制御
            // チップがある場合は邪魔なので消し、ない場合は表示する
            searchInput.placeholder = q ? "" : "キーワードで検索..";
          })();
        </script>
      `}
    </section>
  )
}