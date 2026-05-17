// src/components/SearchArea.tsx

import type { FC } from 'hono/jsx'

const CONFIG = {
  api: { basePath: '/api/area-drilldown' },
  ids: { root: 'area-drilldown-root' },
  labels: {
    defaultPlaceholder: 'エリアを選択'
  },
  design: {
    width: '100%',
    borderRadius: '12px',
    colors: { 
      border: '#e5e7eb', 
      borderHover: '#cbd5e1',
      text: '#64748b', 
      textDark: '#1e293b',
      textArrow: '#94a3b8',
      background: '#fff', 
      hoverBg: '#f9fafb' 
    }
  }
} as const

interface SearchAreaProps {
  currentParams?: URLSearchParams;
  areaName?: string;
}

export const SearchArea: FC<SearchAreaProps> = ({ currentParams, areaName }) => {  
  const parentId = currentParams?.get('parent_id');

  // 💡 1. ボタンクリック時専用のパスを作成
  // parent_idがない（閉じている）場合は、現在選択中のareaを親としてセットする
  const getTriggerPath = () => {
    const params = new URLSearchParams(currentParams?.toString());
    if (!parentId && params.has('area')) {
      params.set('parent_id', params.get('area')!);
    }
    return `${CONFIG.api.basePath}?${params.toString()}`;
  };
  
  // 💡 2. 自動ロード（hx-trigger="load"）用のパスは、現在のパラメータをそのまま使用
  const apiPath = currentParams?.toString() 
    ? `${CONFIG.api.basePath}?${currentParams.toString()}` 
    : CONFIG.api.basePath;

  return (
    <div class="search-area-module" style={{ width: CONFIG.design.width }}>
      <style>{`
        #${CONFIG.ids.root} { width: 100%; overflow: hidden; margin-bottom: 8px; border-radius: ${CONFIG.design.borderRadius}; }
        #${CONFIG.ids.root}:has(.area-list-container) { border: 1px solid ${CONFIG.design.colors.border}; }
      `}</style>

      {/* 💡 parent_idがある場合は自動ロード、なければボタンを表示 */}
      <div id={CONFIG.ids.root} 
        // リロード時：現在のURL状態を復元（開いている階層を維持）
        hx-get={parentId ? apiPath : null} 
        hx-trigger={parentId ? "load" : null}>

        {!parentId && (
          <button 
            class="search-trigger" 
            // クリック時：現在のareaを親とみなして「続き」から開始
            hx-get={getTriggerPath()}
            hx-target={`#${CONFIG.ids.root}`}
          >
            {/* style属性をJSXオブジェクト形式に変更 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📍</span>
              <span>{areaName || CONFIG.labels.defaultPlaceholder}</span>
            </div>
            {/* style属性をJSXオブジェクト形式に変更 */}
            <span style={{ color: CONFIG.design.colors.textArrow }}>▼</span>
          </button>
        )}
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (() => {
          // 💡 ガード節：初期化済みの場合は即座に終了（ネストを深くしない）
          if (window.__searchAreaClickInitialized) return;
          window.__searchAreaClickInitialized = true;

          document.addEventListener('click', (e) => {
            const root = document.getElementById('${CONFIG.ids.root}');
            
            // 💡 ガード節：モーダルの外側をクリックした時以外は無視
            if (!root || root.contains(e.target) || !root.querySelector('.area-list-container')) return;

            // 💡 実際の処理（ネストが最も浅い状態で実行できる）
            const url = new URL(window.location.href);
            url.searchParams.delete('parent_id');
            window.location.href = url.toString();
          });
        })();
      ` }} />
    </div>
  );
};