/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 * [Role] 複数キーワード検索（チップ形式）および検索履歴（datalist）のUI
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

// 検索窓に関する定数定義
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
  
  // 検索上限に達しているかどうかに応じてプレースホルダーを切り替え
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
        // 💡 送信時に既存チップのnameを'q'に書き換え、さらにLocalStorageへキーワードを保存
        onsubmit="this.querySelectorAll('.js-existing-q').forEach(el => el.name = 'q'); window.saveKeyword();"
      >

        {/* 💡 対策1: hiddenをwrapperの外、formの直下に集約（iOSの認識を助ける） */}
        {otherParams.map(([key, value]) => (
          <input type="hidden" name={key} value={value} />
        ))}

        {/* 💡 既存キーワードを 'q-hidden' で保持し、送信直前に 'q' に変換する */}
        {keywords.map(word => (
          <input type="hidden" name="q-hidden" value={word} class="js-existing-q" />
        ))}

        <div class="header-search-input-wrapper">
          {/* 現在適用されているキーワードをチップとして表示 */}
          {keywords.map(word => {
            const otherWords = keywords.filter(k => k !== word);
            const deleteUrl = createSearchUrl(currentParams, { q: otherWords });

            return (
              <span class="search-chip">
                {word}
                {/* 削除リンク：クリックで対象キーワードを除外したURLへ遷移 */}
                <a href={deleteUrl} class="search-chip-delete" style="text-decoration: none;">×</a>
              </span>
            );
          })}

          {/* 3. 新規キーワード入力窓 */}
          <input 
            id={CONFIG.inputId}
            type="search"         // iOSで「検索」ボタンを表示させるためsearchを指定
            enterkeyhint="search" // キーボードの確定ボタンを「検索」に変更
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
        
        {/* 💡 対策4: datalistは一番最後に配置（iPhoneでのレンダリング干渉を防ぐ） */}
        <datalist id={CONFIG.listId}></datalist>
      </form>

      {/* 外部定義された履歴管理ロジックを注入 */}
      <script dangerouslySetInnerHTML={{ __html: headerSearchHistory }} />
    </nav>
  )
}