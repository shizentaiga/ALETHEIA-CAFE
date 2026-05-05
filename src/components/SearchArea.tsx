/**
 * [File Path] src/components/SearchArea.tsx
 */
import type { FC } from 'hono/jsx'

// 💡 今後のビルドエラーを防ぐため、Propsの型定義を追加
interface SearchAreaProps {
  currentParams?: URLSearchParams;
}

export const SearchArea: FC<SearchAreaProps> = ({ currentParams }) => {
  // 💡 現在のURLパラメータを文字列化して、APIエンドポイントを構築
  const queryString = currentParams?.toString();
  const apiPath = queryString ? `/api/area-drilldown?${queryString}` : '/api/area-drilldown';

  return (
    <div class="search-area-module">
      <style>{`
        .search-area-module { 
          width: 50%; 
        }
        
        .search-trigger {
          width: 100%; padding: 12px 16px; border-radius: 12px;
          border: 1px solid #e5e7eb; background: #fff;
          text-align: left; font-size: 0.9rem; color: #64748b;
          cursor: pointer; display: flex; justify-content: space-between;
          align-items: center; transition: background 0.2s;
        }
        .search-trigger:hover { background: #f9fafb; }
        .trigger-content { display: flex; align-items: center; gap: 6px; }
        .trigger-arrow { font-size: 0.8rem; color: #94a3b8; }

        #area-drilldown-root {
          width: 100%;
          background: #fff; 
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 8px; 
        }

        #area-drilldown-root:has(.area-list-container) {
          border: 1px solid #e5e7eb;
        }
      `}</style>

      <div id="area-drilldown-root">
        <button 
          class="search-trigger" 
          type="button" 
          hx-get={apiPath}  /* 💡 ここで現在の検索条件をAPIへ引き渡す */
          hx-target="#area-drilldown-root"
          hx-trigger="click"
        >
          <div class="trigger-content">
            <span>📍</span>
            <span>エリアを選択</span>
          </div>
          <span class="trigger-arrow">▼</span>
        </button>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.addEventListener('click', (e) => {
          const root = document.getElementById('area-drilldown-root');
          if (root && !root.contains(e.target) && root.querySelector('.area-list-container')) {
            location.reload();
          }
        });
      ` }} />
    </div>
  );
};