// src/components/SearchAttribute.tsx

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
  // 💡 URLの中にすでに 'attrs'（選択中の特徴）があるか、またはモーダル展開用の 'open_attrs' フラグがあるかを判定
  const hasAttrs = currentParams?.has('attrs');
  const isOpen = currentParams?.has('open_attrs') || hasAttrs;

  // 💡 1. ボタンクリック時に非同期ロードするパス（URL状態を丸ごと引き継ぎ、オープンフラグを立てる）
  const getTriggerPath = () => {
    const params = new URLSearchParams(currentParams?.toString());
    params.set('open_attrs', '1');
    return `${CONFIG.api.basePath}?${params.toString()}`;
  };
  
  // 💡 2. 自動ロード（hx-trigger="load"）用のパス（リロード時に状態を維持するため）
  const apiPath = currentParams?.toString() 
    ? `${CONFIG.api.basePath}?${currentParams.toString()}` 
    : CONFIG.api.basePath;

  return (
    <div class="search-attribute-module" style={{ width: CONFIG.design.width }}>
      <style>{`
        #${CONFIG.ids.root} { width: 100%; overflow: hidden; margin-bottom: 8px; border-radius: ${CONFIG.design.borderRadius}; }
        #${CONFIG.ids.root}:has(.attribute-modal-container) { border: 1px solid ${CONFIG.design.colors.border}; }
      `}</style>

      {/* 💡 条件を満たしている場合は自動ロード、そうでなければ初期状態のボタンを表示 */}
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

      {/* 💡 モーダルの外側をクリックした時に、URLから特徴検索用のオープンフラグをクレンジングして閉じるJavaScript */}
      <script dangerouslySetInnerHTML={{ __html: `
        (() => {
          // 💡 ガード節：初期化済みの場合は即座に終了（ネストを深くしない）
          if (window.__searchAttributeClickInitialized) return;
          window.__searchAttributeClickInitialized = true;

          document.addEventListener('click', (e) => {
            const root = document.getElementById('${CONFIG.ids.root}');
            
            // 💡 ガード節：モーダルの外側をクリックした時以外は無視
            if (!root || root.contains(e.target) || !root.querySelector('.attribute-modal-container')) return;

            // 💡 実際の処理（ネストが最も浅い状態で実行できる）
            const url = new URL(window.location.href);
            url.searchParams.delete('open_attrs');
            
            // 💡 閉じるときに、もしチェックボックスが何も選ばれていなければ、見た目をスッキリさせるためにリロード
            window.location.href = url.toString();
          });
        })();
      ` }} />
    </div>
  );
};