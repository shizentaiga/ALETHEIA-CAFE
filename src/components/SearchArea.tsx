/**
 * [File Path] src/components/SearchArea.tsx
 */
import type { FC } from 'hono/jsx'

// --- 1. 定数・デザイン変数の切り出し ---
const CONFIG = {
  labels: {
    placeholder: 'エリアを選択',
    icon: '📍',
    arrow: '▼',
  },
  api: {
    basePath: '/api/area-drilldown',
  },
  ids: {
    root: 'area-drilldown-root',
  },
  design: {
    width: '50%',
    borderRadius: '12px',
    colors: {
      border: '#e5e7eb',
      text: '#64748b',
      textSecondary: '#94a3b8',
      background: '#fff',
      hoverBg: '#f9fafb',
    }
  }
} as const

interface SearchAreaProps {
  currentParams?: URLSearchParams;
  areaName?: string;
}

export const SearchArea: FC<SearchAreaProps> = ({ currentParams, areaName }) => {
  // --- 2. ロジック部 (変更なし) ---
  const queryString = currentParams?.toString();
  const apiPath = queryString 
    ? `${CONFIG.api.basePath}?${queryString}` 
    : CONFIG.api.basePath;

  return (
    <div class="search-area-module">
      <style>{`
        .search-area-module { 
          width: ${CONFIG.design.width}; 
        }
        
        .search-trigger {
          width: 100%; padding: 12px 16px; border-radius: ${CONFIG.design.borderRadius};
          border: 1px solid ${CONFIG.design.colors.border}; background: ${CONFIG.design.colors.background};
          text-align: left; font-size: 0.9rem; color: ${CONFIG.design.colors.text};
          cursor: pointer; display: flex; justify-content: space-between;
          align-items: center; transition: background 0.2s;
        }
        .search-trigger:hover { background: ${CONFIG.design.colors.hoverBg}; }
        .trigger-content { display: flex; align-items: center; gap: 6px; }
        .trigger-arrow { font-size: 0.8rem; color: ${CONFIG.design.colors.textSecondary}; }

        #${CONFIG.ids.root} {
          width: 100%;
          background: ${CONFIG.design.colors.background}; 
          border-radius: ${CONFIG.design.borderRadius};
          overflow: hidden;
          margin-bottom: 8px; 
        }

        #${CONFIG.ids.root}:has(.area-list-container) {
          border: 1px solid ${CONFIG.design.colors.border};
        }
      `}</style>

      <div id={CONFIG.ids.root}>
        <button 
          class="search-trigger" 
          type="button" 
          hx-get={apiPath} 
          hx-target={`#${CONFIG.ids.root}`}
          hx-trigger="click"
        >
          <div class="trigger-content">
            <span>{CONFIG.labels.icon}</span>
            <span>{areaName ||CONFIG.labels.placeholder}</span>
          </div>
          <span class="trigger-arrow">{CONFIG.labels.arrow}</span>
        </button>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('click', (e) => {
          const root = document.getElementById('${CONFIG.ids.root}');
          if (root && !root.contains(e.target) && root.querySelector('.area-list-container')) {
            location.reload();
          }
        });
      ` }} />
    </div>
  );
};