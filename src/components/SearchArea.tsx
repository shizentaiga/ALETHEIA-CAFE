import type { FC } from 'hono/jsx'

const moduleStyle = `
  .search-trigger {
    width: 100%; padding: 12px 16px; border-radius: 12px;
    border: 1px solid #e5e7eb; background: #fff;
    font-size: 0.9rem; color: #64748b; cursor: pointer;
    display: flex; justify-content: space-between; align-items: center;
  }
  .trigger-content { display: flex; align-items: center; gap: 6px; }
  .trigger-arrow { font-size: 0.8rem; color: #94a3b8; }
`

const LABELS = {
  defaultButtonText: "エリア",
  icon: "📍"
}

export const SearchArea: FC<{ class?: string }> = ({ class: className }) => (
  <>
    <style>{moduleStyle}</style>
    <button class={`search-trigger ${className || ''}`} type="button">
      
      <div class="trigger-content">
        <span>{LABELS.icon}</span>
        <span>{LABELS.defaultButtonText}</span>
      </div>

      <span class="trigger-arrow">▼</span>

    </button>
  </>
)