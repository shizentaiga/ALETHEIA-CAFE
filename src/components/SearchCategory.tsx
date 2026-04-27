import { html } from 'hono/html'
import type { FC } from 'hono/jsx'

/**
 * 【Design Settings】
 * デザイナー向け：チェックボックスやグリッドの見た目はここを編集してください。
 */
const moduleStyle = (scope: string) => `
  #${scope} { 
    background: #fff; 
    padding: 16px; 
    border: 1px solid #eee; 
    border-radius: 12px; 
  }
  #${scope} .title { 
    font-size: 0.9rem; 
    font-weight: 700; 
    margin-bottom: 12px; 
    color: #333; 
  }
  #${scope} .category-grid { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 10px; 
  }
  #${scope} .cat-item { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
    font-size: 0.9rem; 
    cursor: pointer; 
  }
  #${scope} input[type="checkbox"] { 
    width: 18px; 
    height: 18px; 
    cursor: pointer; 
  }
`

/**
 * 【Content & Data Settings】
 */
const LABELS = {
  sectionTitle: "絞り込み条件"
}

// DBのカテゴリテーブル等を想定したモックデータ
const MOCK_CATEGORIES = [
  { id: "wifi", label: "Wi-Fiあり" },
  { id: "outlet", label: "電源あり" },
  { id: "smoking", label: "喫煙可" },
  { id: "quiet", label: "静か" }
]

export const SearchCategory: FC = () => {
  const scope = "search-category-module"

  return (
    <section id={scope}>
      <style>{moduleStyle(scope)}</style>

      <div class="title">{LABELS.sectionTitle}</div>
      
      <div class="category-grid">
        {MOCK_CATEGORIES.map(cat => (
          <label class="cat-item">
            <input 
              type="checkbox" 
              value={cat.id} 
              onchange="updateCategories()" 
            />
            {cat.label}
          </label>
        ))}
      </div>

      {html`
        <script>
          function updateCategories() {
            // このモジュール内のチェックされた値を抽出
            const checked = Array.from(
              document.querySelectorAll('#${scope} input:checked')
            ).map(el => el.value);
            
            console.log("選択中のカテゴリ:", checked);
            // 後の拡張用：HTMX連携や他コンポーネントへの通知をここに記述
          }
        </script>
      `}
    </section>
  )
}