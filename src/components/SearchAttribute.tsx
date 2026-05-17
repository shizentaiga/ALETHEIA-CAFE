/**
 * [ファイルパス] src/components/SearchAttribute.tsx
 */

import type { FC } from 'hono/jsx'
import type { ValidAttributeKey } from '../lib/searchUtils' // 💡 型定義インポート

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
  attrs?: ValidAttributeKey[]; // 💡 受け取るPropsにattrsを追加
}

export const SearchAttribute: FC<SearchAttributeProps> = ({ currentParams, attrs }) => {  
  const isOpen = currentParams?.has('open_attrs');

  const getTriggerPath = () => {
    const params = new URLSearchParams(currentParams?.toString());
    
    // 💡 親（TopPage）でせっかく正規化した attrs 配列が存在する場合、ここで確実にパラメータへマージする
    if (attrs && attrs.length > 0) {
      params.set('attrs', attrs.join(','));
    }

    params.set('open_attrs', '1');
    return `${CONFIG.api.basePath}?${params.toString()}`;
  };

  return (
    <div class="search-attribute-module" style={{ width: CONFIG.design.width }}>
      <style>{`
        #${CONFIG.ids.root} { width: 100%; overflow: hidden; margin-bottom: 8px; border-radius: ${CONFIG.design.borderRadius}; }
        #${CONFIG.ids.root}:has(.attribute-modal-container) { border: 1px solid ${CONFIG.design.colors.border}; }
      `}</style>

      <div id={CONFIG.ids.root}>
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

      {/* 💡 SearchAreaを参考にした外側クリック監視用の最小限のスクリプト */}
      <script dangerouslySetInnerHTML={{ __html: `
        (() => {
          // 💡 ガード節：初期化済みの場合は即座に終了
          if (window.__searchAttributeClickInitialized) return;
          window.__searchAttributeClickInitialized = true;

          document.addEventListener('click', (e) => {
            const root = document.getElementById('${CONFIG.ids.root}');
            
            // 💡 ガード節：モーダルの外側をクリックした時以外は無視
            if (!root || root.contains(e.target) || !root.querySelector('.attribute-modal-container')) return;

            // 💡 open_attrs を削除してクリーンに元の状態へリロード
            const url = new URL(window.location.href);
            url.searchParams.delete('open_attrs');
            window.location.href = url.toString();
          });
        })();
      ` }} />
    </div>
  );
};