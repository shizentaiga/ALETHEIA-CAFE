/**
 * [ファイルパス] src/components/SearchAttribute.tsx
 */

import type { FC } from 'hono/jsx'

const CONFIG = {
  api: { basePath: '/api/attribute-search' },
  ids: { root: 'attribute-search-root' },
  labels: {
    defaultPlaceholder: '特徴で探す',
    icon: '⚙'
  },
  design: {
    width: '100%',
    borderRadius: '12px',
    colors: { 
      border: '#e5e7eb', 
      textArrow: '#94a3b8'
    }
  }
} as const

interface SearchAttributeProps {
  currentParams?: URLSearchParams;
}

export const SearchAttribute: FC<SearchAttributeProps> = ({ currentParams }) => {  
  const isOpen = currentParams?.has('open_attrs');

  const getTriggerPath = () => {
    const params = new URLSearchParams(currentParams?.toString());
    params.set('open_attrs', '1');
    return `${CONFIG.api.basePath}?${params.toString()}`;
  };
  
  const apiPath = typeof window !== 'undefined' 
    ? `${CONFIG.api.basePath}${window.location.search}`
    : `${CONFIG.api.basePath}?${currentParams?.toString() || ''}`;

  // 💡 JavaScript を使わずに、HTML（aタグ）だけで「 open_attrs 」を消して閉じるURLを作る
  const closeParams = new URLSearchParams(currentParams?.toString());
  closeParams.delete('open_attrs');
  const closeUrl = closeParams.toString() ? `/?${closeParams.toString()}` : '/';

  return (
    <div class="search-attribute-module" style={{ width: CONFIG.design.width }}>
      <style>{`
        #${CONFIG.ids.root} { width: 100%; overflow: hidden; margin-bottom: 8px; border-radius: ${CONFIG.design.borderRadius}; }
        #${CONFIG.ids.root}:has(.attribute-modal-container) { border: 1px solid ${CONFIG.design.colors.border}; }
        
        /* 💡 モーダルが開いている時、画面全体を覆う透明なバックドロップ（壁）を作る */
        .modal-backdrop-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 999; /* モーダルの直下に配置 */
          background: transparent;
        }
        /* モーダル自体の z-index を上げて、バックドロップより前面に出す */
        .attribute-modal-container {
          position: relative;
          z-index: 1000;
        }
      `}</style>

      {/* 💡 モーダルが開いている時だけ、外側クリック用の透明リンクを背後に配置 */}
      {isOpen && (
        <a href={closeUrl} class="modal-backdrop-overlay" aria-hidden="true"></a>
      )}

      <div id={CONFIG.ids.root} 
        hx-get={isOpen ? apiPath : null} 
        hx-trigger={isOpen ? "load" : null}>

        {!isOpen && (
          <button 
            class="search-trigger" 
            hx-get={getTriggerPath()}
            hx-target={`#${CONFIG.ids.root}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{CONFIG.labels.icon}</span>
              <span>{CONFIG.labels.defaultPlaceholder}</span>
            </div>
            <span style={{ color: CONFIG.design.colors.textArrow }}>▼</span>
          </button>
        )}
      </div>

      {/* ❌ 複雑なバグの原因になっていた <script> タグ（document.addEventListener）はすべて削除しました */}
    </div>
  );
};