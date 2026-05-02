/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 * [Role] UI for multi-keyword search with chips and OOB synchronization.
 */
import type { FC } from 'hono/jsx'
import { createSearchUrl } from '../../lib/search'

interface HeaderSearchProps {
  keywords: string[];
  placeholder: string;
  area: string;
}

const CONFIG = {
  // メインターゲットは検索結果エリア
  target: '#search-result-module',
  // ヘッダー自身のID（OOB更新用）
  headerId: 'header-search-nav',
  searchIcon: '🔍',
  inputId: 'q-input-header'
} as const

export const HeaderSearch: FC<HeaderSearchProps> = ({ keywords, placeholder, area }) => {
  return (
    /**
     * [安定化対策] hx-swap-oob="true" を付与。
     * これにより、サーバーがこの要素を返した際、hx-target の場所に関わらず
     * 同一ID (#header-search-nav) の要素が自動的に差し替わります。
     */
    <nav id={CONFIG.headerId} hx-swap-oob="true">
      <form 
        class="header-search-form" 
        hx-get="" // 空文字指定により現在のURLエンドポイントを維持
        hx-target={CONFIG.target} 
        hx-push-url="true"
        // 検索窓の文字を消すためのトリガー
        hx-on--after-request={`document.getElementById('${CONFIG.inputId}').value = ''`}
      >
        <div class="header-search-input-wrapper">
          {/* 1. 既存キーワードの維持 (AND検索用) */}
          {keywords.map(word => (
            <input type="hidden" name="q" value={word} />
          ))}

          {/* 2. チップ表示と削除機能 */}
          {keywords.map(word => {
            // lib/search.ts の関数を使用して安全に削除後URLを生成
            const otherWords = keywords.filter(k => k !== word);
            const deleteUrl = createSearchUrl(otherWords); 
            // area が必要な場合は、createSearchUrl のbaseUrl等で調整するか、
            // new URLSearchParams を活用するロジックを lib に追加しても良いでしょう。

            return (
              <span class="search-chip">
                {word}
                <button 
                  type="button"
                  class="search-chip-delete"
                  hx-get={deleteUrl}
                  hx-target={CONFIG.target}
                  hx-push-url="true"
                  aria-label={`Remove ${word}`}
                >
                  ×
                </button>
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