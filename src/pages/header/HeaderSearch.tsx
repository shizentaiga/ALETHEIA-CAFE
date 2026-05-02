/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 * [Role] UI for multi-keyword search with chips and history (datalist).
 */
import type { FC } from 'hono/jsx'
import { createSearchUrl } from '../../lib/searchUtils'
import { headerStyle } from './headerStyle'
import { headerSearchHistory } from './headerSearchHistory'

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
} as const

export const HeaderSearch: FC<HeaderSearchProps> = ({ keywords, placeholder, area }) => {
  return (
    <nav id={CONFIG.headerId}>
      {/* 既存のスタイル + 履歴用スタイル */}
      <style>{headerStyle}</style>
      
      <form 
        class="header-search-form" 
        method="get" 
        action="/"
        onsubmit="window.saveKeyword()"
      >
        <div class="header-search-input-wrapper">
          {/* --- ここから追加 --- */}
          {/* 現在のエリア情報を維持する（URLパラメータ area=... に対応） */}
          {area && <input type="hidden" name="area" value={area} />}
          {/* --- ここまで追加 --- */}
          
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