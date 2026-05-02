/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 * [Role] UI for multi-keyword search with chips and history (datalist).
 */
import type { FC } from 'hono/jsx'
import { createSearchUrl } from '../../lib/searchUtils'
import { headerStyle } from './headerStyle'
import { headerSearchHistory } from './headerSearchHistory'

// --- Future Style Exports (将来的に headerStyle.ts に移動可能なCSS) ---
const historyUIStyle = `
  .search-history-controls {
    margin-top: 4px;
    padding-left: 16px;
    height: 18px; /* 高さを固定して表示/非表示時のガタつきを抑える */
  }
  .search-history-clear-link {
    font-size: 11px;
    color: #9ca3af;
    text-decoration: none;
    cursor: pointer;
    display: none; /* 初期状態は非表示 (JSで制御) */
  }
  .search-history-clear-link:hover {
    color: #6b7280;
    text-decoration: underline;
  }
`;

interface HeaderSearchProps {
  keywords: string[];
  placeholder: string;
  area: string;
}

const CONFIG = {
  headerId: 'header-search-nav',
  searchIcon: '🔍',
  inputId: 'q-input-header',
  listId: 'searchHistoryList',
  clearLinkId: 'searchHistoryClearLink'
} as const

export const HeaderSearch: FC<HeaderSearchProps> = ({ keywords, placeholder, area }) => {
  return (
    <nav id={CONFIG.headerId}>
      {/* 既存のスタイル + 履歴用スタイル */}
      <style>{headerStyle}</style>
      <style>{historyUIStyle}</style>
      
      <form 
        class="header-search-form" 
        method="get" 
        action="/"
        onsubmit="window.saveKeyword()"
      >
        <div class="header-search-input-wrapper">
          {/* 1. 既存キーワードの維持 */}
          {keywords.map(word => (
            <input type="hidden" name="q" value={word} />
          ))}

          {/* 2. チップ表示 */}
          {keywords.map(word => {
            const otherWords = keywords.filter(k => k !== word);
            const deleteUrl = createSearchUrl(otherWords); 
            return (
              <span class="search-chip">
                {word}
                <a href={deleteUrl} class="search-chip-delete" style="text-decoration: none;">×</a>
              </span>
            );
          })}

          {/* 3. 新規キーワード入力窓 (datalistを紐付け) */}
          <input 
            id={CONFIG.inputId}
            type="text" 
            name="q" 
            list={CONFIG.listId}
            class="header-search-input" 
            placeholder={keywords.length >= 5 ? "上限です" : (keywords.length > 0 ? "" : placeholder)}
            disabled={keywords.length >= 5}
            autocomplete="off"
          />
          
          <button 
            type="submit" 
            class="header-search-button" 
            aria-label="Search"
            disabled={keywords.length >= 5}
          >
            {CONFIG.searchIcon}
          </button>
        </div>
        
        {/* 履歴用データリスト */}
        <datalist id={CONFIG.listId}></datalist>
      </form>

      {/* クライアントサイド・ロジックの注入 */}
      <script dangerouslySetInnerHTML={{ __html: headerSearchHistory }} />
    </nav>
  )
}