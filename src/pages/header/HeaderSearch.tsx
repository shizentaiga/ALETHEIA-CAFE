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
        onsubmit="this.querySelectorAll('.js-existing-q').forEach(el => el.name = 'q')"
      >

        {/* 💡 対策1: hiddenをwrapperの外、formの直下に集約（iOSの認識を助ける） */}
        {otherParams.map(([key, value]) => (
          <input type="hidden" name={key} value={value} />
        ))}

        {/* 💡 既存キーワードを 'q-hidden' で保持 */}
        {keywords.map(word => (
          <input type="hidden" name="q-hidden" value={word} class="js-existing-q" />
        ))}

        <div class="header-search-input-wrapper">
          {/* チップ表示 */}
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
            type="search"   // textからsearchに変更
            enterkeyhint="search" // 追加
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
        
        {/* 💡 対策4: datalistは一番最後に配置（干渉を防ぐ） */}
        <datalist id={CONFIG.listId}></datalist>
      </form>

      {/* <script dangerouslySetInnerHTML={{ __html: headerSearchHistory }} /> */}
    </nav>
  )
}