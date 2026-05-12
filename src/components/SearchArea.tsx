import type { FC } from 'hono/jsx'

const CONFIG = {
  api: { basePath: '/api/area-drilldown' },
  ids: { root: 'area-drilldown-root' },
  design: {
    width: '50%',
    borderRadius: '12px',
    colors: { border: '#e5e7eb', text: '#64748b', background: '#fff', hoverBg: '#f9fafb' }
  }
} as const

interface SearchAreaProps {
  currentParams?: URLSearchParams;
  areaName?: string;
}

export const SearchArea: FC<SearchAreaProps> = ({ currentParams, areaName }) => {
  const parentId = currentParams?.get('parent_id');
  const apiPath = currentParams?.toString() 
    ? `${CONFIG.api.basePath}?${currentParams.toString()}` 
    : CONFIG.api.basePath;

  return (
    <div class="search-area-module" style={{ width: CONFIG.design.width }}>
      <style>{`
        .search-trigger { width: 100%; padding: 12px 16px; border-radius: ${CONFIG.design.borderRadius}; border: 1px solid ${CONFIG.design.colors.border}; background: ${CONFIG.design.colors.background}; text-align: left; font-size: 0.9rem; color: ${CONFIG.design.colors.text}; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
        #${CONFIG.ids.root} { width: 100%; overflow: hidden; margin-bottom: 8px; border-radius: ${CONFIG.design.borderRadius}; }
        #${CONFIG.ids.root}:has(.area-list-container) { border: 1px solid ${CONFIG.design.colors.border}; }
      `}</style>

      {/* 💡 parent_idがある場合は自動ロード、なければボタンを表示 */}
      <div id={CONFIG.ids.root} 
           hx-get={parentId ? apiPath : null} 
           hx-trigger={parentId ? "load" : null}>
        {!parentId && (
          <button class="search-trigger" hx-get={apiPath} hx-target={`#${CONFIG.ids.root}`}>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>📍</span>
              <span>{areaName || 'エリアを選択'}</span>
            </div>
            <span style="color: #94a3b8;">▼</span>
          </button>
        )}
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('click', (e) => {
          const root = document.getElementById('${CONFIG.ids.root}');
          if (root && !root.contains(e.target) && root.querySelector('.area-list-container')) {
            const url = new URL(window.location.href);
            url.searchParams.delete('parent_id');
            window.location.href = url.toString();
          }
        });
      ` }} />
    </div>
  );
};