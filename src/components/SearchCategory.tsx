import type { FC } from 'hono/jsx'

/**　【Design Settings】 */
const moduleStyle = (scope: string) => `
  #${scope} {
    width: 100%;
  }
  .trigger-button {
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    background: #fff;
    text-align: left;
    font-size: 0.9rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .trigger-button:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
  .trigger-label {
    display: flex;
    align-items: center;
    gap: 6px;
  }
`

/** 【Content & Data Settings】 */
const LABELS = {
  sectionTitle: "条件",
  icon: "⚙"
}

export const SearchCategory: FC = () => {
  const scope = "search-category-module"

  return (
    <section id={scope}>
      <style>{moduleStyle(scope)}</style>

      {/* 現在は単なるボタンですが、後にここに 
          hx-get="/filter-panel" などのHTMX属性を付与して
          右スライドのドロワーを呼び出す形に進化させます。
      */}
      <button class="trigger-button" type="button">
        <div class="trigger-label">
          <span>{LABELS.icon}</span>
          <span>{LABELS.sectionTitle}</span>
        </div>
        <span style="font-size: 0.8rem; color: #94a3b8;">▼</span>
      </button>
    </section>
  )
}