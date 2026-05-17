/**
 * [File Path] src/pages/header/HeaderSearch.tsx
 * [Role] 複数キーワード検索（チップ形式）、特徴チップ表示、および検索履歴（datalist）のUI
 */
import type { FC } from 'hono/jsx'
import { useRequestContext } from 'hono/jsx-renderer'
import { headerSearchHistory } from './headerSearchHistory'
import { createSearchUrl, ValidAttributeKey } from '../../lib/searchUtils'
// 💡 日本語ラベル定義をマスタデータとしてインポート
import { UNIQUE_FEATURES, INFRA_FEATURES } from '../../db/queries/transformers'

interface HeaderSearchProps {
  keywords: string[];
  placeholder: string;
  areaName?: string;
  attrs?: ValidAttributeKey[]; // Propsに型定義を追加
}

// 検索窓に関する定数定義
const CONFIG = {
  headerId: 'header-search-nav',
  searchIcon: '🔍',
  inputId: 'q-input-header',
  listId: 'searchHistoryList',
  maxKeywords: 20,
} as const

// 💡 UNIQUE_FEATURES と INFRA_FEATURES を結合し、英語キーから日本語名を一発で引ける辞書（Map）を事前ビルド
const FEATURE_LABEL_MAP = new Map<string, string>([
  ...UNIQUE_FEATURES.map(f => [f.key, f.label] as const),
  ...INFRA_FEATURES.map(f => [f.key, f.label] as const)
]);

export const HeaderSearch: FC<HeaderSearchProps> = ({ keywords, placeholder, areaName: propsAreaName, attrs }) => {
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
    : (keywords.length > 0 || areaName || (attrs && attrs.length > 0) ? "" : placeholder);

  // 💡 【バグ防止】q, area, areaName に加え、「attrs」も otherParams の除外対象に追加
  // これにより、下部のループ展開時に古い attrs フィールドが勝手に量産されるのを防ぎます。
  const otherParams: [string, string][] = [];
  currentParams.forEach((value, key) => {
    if (key !== 'q' && key !== 'area' && key !== 'areaName' && key !== 'q-hidden' && key !== 'attrs') {
      otherParams.push([key, value]);
    }
  });

  return (
    <nav id={CONFIG.headerId}>
      <form 
        class="header-search-form" 
        method="get" 
        action="/"

        // 💡 【重要】送信直前に、既存のチップ（配列）と新規入力値を「1本のカンマ区切り」に結合して js-final-q に注入
        // 💡 【修正】document.getElementById の引数を JSX の仕組みできちんと評価されるように変更
        onsubmit={`
          const inputEl = document.getElementById('${CONFIG.inputId}');
          const newWord = inputEl ? inputEl.value.trim() : '';
          let words = ${JSON.stringify(keywords)};
          if (newWord) {
            // 空白やカンマで区切られた新規入力を配列化して合算
            const splitWords = newWord.split(/[\\s　,]+/).filter(Boolean);
            words = [...new Set([...words, ...splitWords])];
          }
          // 最終的な1本化用hiddenフィールドにカンマ区切りでセット
          document.getElementById('js-final-q').value = words.join(',');
          if (inputEl) inputEl.name = ''; // ダミー入力のネイティブ送信を無効化（多重送信防止）
          window.saveKeyword();
        `}
      >

        {/* 2. 状態の維持 (hidden) */}
        {areaValue && <input type="hidden" name="area" value={areaValue} />}
        {areaName && <input type="hidden" name="areaName" value={areaName} />}

        {/* 💡 現在選択されている特徴パラメータ(attrs)の状態をフォーム送信時にも維持する隠しフィールド */}
        {attrs && attrs.length > 0 && (
          <input type="hidden" name="attrs" value={attrs.join(',')} />
        )}

        {/* attrs等、他の全てのパラメータはここで無傷のまま安全に自動引き継ぎ */}
        {otherParams.map(([key, value]) => (
          <input type="hidden" name={key} value={value} />
        ))}

        {/* 💡 【対策】最終的にシリアライズされて送信される唯一の q パラメータの格納先 */}
        <input type="hidden" id="js-final-q" name="q" value="" />

        <div class="header-search-input-wrapper">

          {/* 3. エリアチップの表示 */}
          {areaName && (
            <span class="search-chip area-chip">
              {areaName}
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

          {/* 💡 4.5 特徴チップ(attrs)の表示 */}
          {attrs && attrs.map(attrKey => {
            // 定数定義マスタから日本語ラベルを取得（万が一、未知のキーがあれば英語キーのままフォールバック）
            const label = FEATURE_LABEL_MAP.get(attrKey) || attrKey;
            
            // 現在選択されている特徴から、自分自身（このチップ）を除外した配列を作成
            const otherAttrs = attrs.filter(a => a !== attrKey);
            
            // 残りの条件が0個になった場合は、配列ではなく `null` を渡してURLからパラメータごと綺麗に消去する
            const deleteUrl = createSearchUrl(currentParams, { 
              attrs: otherAttrs.length > 0 ? otherAttrs : null 
            });

            return (
              <span class="search-chip attribute-chip">
                {label}
                <a href={deleteUrl} class="search-chip-delete" style="text-decoration: none;">×</a>
              </span>
            );
          })}

          {/* 5. 新規キーワード入力窓 */}
          <input 
            id={CONFIG.inputId}
            type="search"         // iOSで「検索」ボタンを表示させるためsearchを指定
            enterkeyhint="search" // キーボードの確定ボタンを「検索」に変更
            name="q-dummy"        // 💡 【修正】送信直前に JS で一本化するため、素の name="q" による多重送信・上書き衝突を防ぐダミーネームに変更
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