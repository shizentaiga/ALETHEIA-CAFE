/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 * [Role] 複数キーワード検索（チップ形式）および検索履歴（datalist）のUI
 */
import type { FC } from 'hono/jsx'
import { useRequestContext } from 'hono/jsx-renderer'
import { createSearchUrl } from '../../lib/searchUtils'
import { headerSearchHistory } from './headerSearchHistory'

interface HeaderSearchProps {
  keywords: string[];
  placeholder: string;
  areaName?: string;
}

// 検索窓に関する定数定義
const CONFIG = {
  headerId: 'header-search-nav',
  searchIcon: '🔍',
  inputId: 'q-input-header',
  listId: 'searchHistoryList',
  maxKeywords: 20,
} as const

export const HeaderSearch: FC<HeaderSearchProps> = ({ keywords, placeholder, areaName: propsAreaName }) => {
  const c = useRequestContext();
  const currentUrl = new URL(c.req.url);
  const currentParams = currentUrl.searchParams;

  // 1. パラメータの取得
  const areaName = propsAreaName || currentParams.get('areaName');
  const areaValue = currentParams.get('area');

  // キーワード入力数の上限を判定
  const isMax = keywords.length >= CONFIG.maxKeywords;
  const dynamicPlaceholder = isMax 
    ? "上限です" 
    : (keywords.length > 0 || areaName ? "" : placeholder);

  // 💡 Map化による配列パラメータの消失を防ぎつつ、q, area, areaName を除外
  const otherParams: [string, string][] = [];
  currentParams.forEach((value, key) => {
    if (key !== 'q' && key !== 'area' && key !== 'areaName' && key !== 'q-hidden') {
      otherParams.push([key, value]);
    }
  });

  return (
    <nav id={CONFIG.headerId}>
      <form 
        class="header-search-form" 
        method="get" 
        action="/"
        // 💡 送信時に既存チップのnameを'q'に書き換え、さらにLocalStorageへキーワードを保存
        onsubmit="this.querySelectorAll('.js-existing-q').forEach(el => el.name = 'q'); window.saveKeyword();"
      >

        {/* 2. 状態の維持 (hidden) */}
        {areaValue && <input type="hidden" name="area" value={areaValue} />}
        {areaName && <input type="hidden" name="areaName" value={areaName} />}

        {/* 💡 対策1: hiddenをwrapperの外、formの直下に集約（iOSの認識を助ける） */}
        {otherParams.map(([key, value]) => (
          <input type="hidden" name={key} value={value} />
        ))}

        {/* 💡 既存キーワードを 'q-hidden' で保持し、送信直前に 'q' に変換する */}
        {keywords.map(word => (
          <input type="hidden" name="q-hidden" value={word} class="js-existing-q" />
        ))}

        <div class="header-search-input-wrapper">
          {/* 3. エリアチップの表示 */}
          {areaName && (
            <span class="search-chip area-chip">
              📍 {areaName}
              <a 
                // 💡 area: '00'(全国、未指定) を明示的に指定
                href={createSearchUrl(currentParams, { area: '00', areaName: null })} 
                class="search-chip-delete"
              >×</a>
            </span>
          )}

          {/* 4. キーワードチップの表示 */}
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

          {/* 5. 新規キーワード入力窓 */}
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
            aria-label="検索キーワード" // 支援技術向けの説明ラベル(PSI対策)
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