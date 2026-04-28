import type { FC } from 'hono/jsx'

/**
 * 【Design Settings】
 * SearchCategory と共通のトーン＆マナー
 */
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

/**
 * 【Content & Data Settings】
 */
const LABELS = {
  defaultButtonText: "エリア",
  icon: "📍"
}

export const SearchArea: FC = () => {
  const scope = "search-area-module"

  return (
    <section id={scope}>
      <style>{moduleStyle(scope)}</style>

      {/* 最小コード化：モーダルや複雑なJSを排除し、
          「何を選択させるか」の入り口に特化。
      */}
      <button class="trigger-button" type="button">
        <div class="trigger-label">
          <span>{LABELS.icon}</span>
          <span>{LABELS.defaultButtonText}</span>
        </div>
        <span style="font-size: 0.8rem; color: #94a3b8;">▼</span>
      </button>
    </section>
  )
}