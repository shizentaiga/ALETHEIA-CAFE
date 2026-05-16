// src/components/SearchCategory.tsx

import type { FC } from 'hono/jsx'

const moduleStyle = `
  .trigger-content { display: flex; align-items: center; gap: 6px; }
  .trigger-arrow { font-size: 0.8rem; color: #94a3b8; }
`

const LABELS = {
  sectionTitle: "特徴で探す",
  icon: "⚙"
}

export const SearchCategory: FC<{ class?: string }> = ({ class: className }) => (
  <>
    <style>{moduleStyle}</style>
    <button class={`search-trigger${className || ''}`} type="button">
      
      <div class="trigger-content">
        <span>{LABELS.icon}</span>
        <span>{LABELS.sectionTitle}</span>
      </div>

      <span class="trigger-arrow">▼</span>

    </button>
  </>
)