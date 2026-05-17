// src/pages/TopMain.tsx

import type { FC } from 'hono/jsx'
import { SearchArea } from '../components/SearchArea'
import { SearchAttribute } from '../components/SearchAttribute'
import { SearchResult } from '../components/SearchResult'
import type { ValidAttributeKey } from '../lib/searchUtils' // 💡 型定義用にインポート

/**
 * [Design Settings]
 * Layout for the main content area.
 */
const layoutStyle = `
  .top-main-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  .search-bar-row {
    display: flex;
    gap: 12px;
    width: 100%;
    align-items: flex-start; /* 子要素の高さの強制引き伸ばし（stretch）を防ぐ */
  }
    
  /* エリアを広く(2)、条件をコンパクト(1) に割り振ることで黄金比率に */
  .search-bar-row > .search-area-module { flex: 2; }
  .search-bar-row > .search-attribute-module { flex: 1; }

  /* 共通スタイルを親に集約：ボタンの見た目・高さを完全にシンクロさせる */
  .search-trigger {
    width: 100%; 
    padding: 12px 16px; 
    border-radius: 12px; 
    border: 1px solid #e5e7eb; 
    background: #fff; 
    text-align: left; 
    font-size: 0.9rem; 
    color: #1e293b; 
    cursor: pointer; 
    display: flex; 
    justify-content: space-between; 
    align-items: center;
    transition: all 0.15s ease; 
  }
  .search-trigger:hover {
    background: #f9fafb;
    border-color: #cbd5e1;
  }
`

/**
 * TopMain Component
 * Propsに currentParams と attrs を受け取るよう拡張します。
 */
export const TopMain: FC<{ 
  results: any[], 
  total: number, 
  area?: string,
  q?: string,
  attrs?: ValidAttributeKey[], // 💡 将来的に受け取る配列の型を拡張
  areaName?: string,
  currentParams?: URLSearchParams // URLの状態を丸ごと受け取る
}> = ({ results, total, area, q, attrs, areaName, currentParams }) => (
  <section class="top-main-container">
    <style>{layoutStyle}</style>  

    {/* Display search chips (Area and Attribute) */}
    <div class="search-bar-row">
      {/* SearchArea に currentParams を引き継ぎ */}
      <SearchArea currentParams={currentParams} areaName={areaName} />
      
      {/* 💡 新しい特徴検索コンポーネントへ差し替え（バトンをそのまま引き継ぐ） */}
      <SearchAttribute currentParams={currentParams} attrs={attrs}  />
    </div>

    {/* Search Results Section */}
    <SearchResult results={results} total={total} area={area} q={q} />
  </section>
)