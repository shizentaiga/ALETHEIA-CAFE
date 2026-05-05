/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 * [Role] UI for multi-keyword search with chips and history (datalist).
 */
import type { FC } from 'hono/jsx'
import { useRequestContext } from 'hono/jsx-renderer'
import { createSearchUrl } from '../../lib/searchUtils'
import { headerStyle } from './headerStyle'
import { headerSearchHistory } from './headerSearchHistory'

interface HeaderSearchProps {
  keywords: string[];
  placeholder: string;
}

const CONFIG = {
  headerId: 'header-search-nav',
  searchIcon: '🔍',
  inputId: 'q-input-header',
  listId: 'searchHistoryList',
  maxKeywords: 5,
} as const

export const HeaderSearch: FC<HeaderSearchProps> = ({ keywords, placeholder }) => {
  const c = useRequestContext();
  const currentUrl = new URL(c.req.url);
  const currentParams = currentUrl.searchParams;

  // --- 1. 定数・状態の整理 (ネストを減らすための事前準備) ---
  const isMax = keywords.length >= CONFIG.maxKeywords;
  
  // プレースホルダーの決定
  const dynamicPlaceholder = isMax 
    ? "上限です" 
    : (keywords.length > 0 ? "" : placeholder);

  // 💡 パラメータの重複を排除しつつ q 以外を抽出
  // URLに同じキーが複数ある場合、Mapに変換することで最後の値のみが保持され、
  // hiddenフィールドが重複してHTMLが汚れるのを防ぎます
  const otherParams = Array.from(new Map(currentParams.entries()))
    .filter(([key]) => key !== 'q');

  return (
    <nav id={CONFIG.headerId}>
      <style>{headerStyle}</style>
      
      <form 
        class="header-search-form" 
        method="get" 
        action="/"
        onsubmit="window.saveKeyword()"
      >
        <div class="header-search-input-wrapper">
          {/* 💡 q以外のパラメータを hidden で一括維持 */}
          {otherParams.map(([key, value]) => (
            <input type="hidden" name={key} value={value} />
          ))}

          {/* 1. 既存キーワードの hidden 維持 */}
          {keywords.map(word => (
            <input type="hidden" name="q" value={word} />
          ))}

          {/* 2. チップ表示 */}
          {keywords.map(word => {
            const otherWords = keywords.filter(k => k !== word);
            const deleteUrl = createSearchUrl(currentParams, { q: otherWords });

            return (
              <span class="search-chip">
                {word}
                {/* アクセシビリティのため a タグの style を一部調整 */}
                <a href={deleteUrl} class="search-chip-delete" style="text-decoration: none;">×</a>
              </span>
            );
          })}

          {/* 3. 新規キーワード入力窓 */}
          <input 
            id={CONFIG.inputId}
            type="text" 
            name="q" 
            list={CONFIG.listId}
            class="header-search-input" 
            placeholder={dynamicPlaceholder}
            disabled={isMax}
            autocomplete="off"
          />
          
          <button 
            type="submit" 
            class="header-search-button" 
            aria-label="Search"
            disabled={isMax}
          >
            {CONFIG.searchIcon}
          </button>
        </div>
        
        <datalist id={CONFIG.listId}></datalist>
      </form>

      <script dangerouslySetInnerHTML={{ __html: headerSearchHistory }} />
    </nav>
  )
}