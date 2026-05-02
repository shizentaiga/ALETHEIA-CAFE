/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 * [Role] UI for multi-keyword search with chips.
 */
import type { FC } from 'hono/jsx'
import { createSearchUrl } from '../../lib/searchUtils'
import { headerStyle } from './headerStyle'

interface HeaderSearchProps {
  keywords: string[];
  placeholder: string;
  area: string;
}

const CONFIG = {
  headerId: 'header-search-nav',
  searchIcon: '🔍',
  inputId: 'q-input-header'
} as const

export const HeaderSearch: FC<HeaderSearchProps> = ({ keywords, placeholder, area }) => {
  return (
    <nav id={CONFIG.headerId}>
      <style>{headerStyle}</style>
      
      <form 
        class="header-search-form" 
        method="get" 
        action="/"
      >
        <div class="header-search-input-wrapper">
          {/* 1. 既存キーワードの維持 */}
          {keywords.map(word => (
            <input type="hidden" name="q" value={word} />
          ))}

          {/* 2. チップ表示と削除機能 */}
          {keywords.map(word => {
            const otherWords = keywords.filter(k => k !== word);
            const deleteUrl = createSearchUrl(otherWords); 

            return (
              <span class="search-chip">
                {word}
                <a 
                  href={deleteUrl} 
                  class="search-chip-delete"
                  aria-label={`Remove ${word}`}
                  style="text-decoration: none;"
                >
                  ×
                </a>
              </span>
            );
          })}

          {/* 3. 新規キーワード入力窓 */}
          <input 
            id={CONFIG.inputId}
            type="text" 
            name="q" 
            class="header-search-input" 
            placeholder={keywords.length >= 5 ? "上限です" : (keywords.length > 0 ? "" : placeholder)}
            disabled={keywords.length >= 5}
            autocomplete="off"
          />
          
          {area && <input type="hidden" name="area" value={area} />}
          
          <button 
            type="submit" 
            class="header-search-button" 
            aria-label="Search"
            disabled={keywords.length >= 5}
          >
            {CONFIG.searchIcon}
          </button>
        </div>
      </form>
    </nav>
  )
}