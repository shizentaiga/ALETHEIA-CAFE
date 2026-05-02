# キーワード検索履歴：最終実装プラン（完全版）

---

## 1. 構成ファイルと役割

ファイル名は命名規則に従い `headerSearchHistory.ts` を採用する。

| ファイルパス | 役割 |
|:---|:---|
| `src/lib/constants.ts` | 定数管理：`KEY`、`MAX_COUNT`（5）、`MAX_CHARS`（20）を定義 |
| `src/pages/header/headerSearchHistory.ts` | ロジック：文字列化された JS。HTMX の「戻る」ボタン対応等を含む |
| `src/pages/header/HeaderSearch.tsx` | View：`autocomplete="off"` 設定済みの `input` と `datalist` |

---

## 2. 最終ロジックの設計仕様

### ① ブラウザ干渉の排除（`autocomplete="off"`）

`HeaderSearch.tsx` 内の `input` タグに `autocomplete="off"` を明示する。ブラウザが記憶している汎用的な入力履歴が被さるのを防ぎ、自作の `datalist` だけが表示されるようになる。

### ② HTMX 完全対応（`afterSwap` & `historyRestore`）

`headerSearchHistory.ts` 内の初期化ロジックに以下のイベントリスナーを追加する。

| イベント | タイミング |
|:---|:---|
| `htmx:afterSwap` | 検索結果が表示された後やページが動的に書き換わった後に実行 |
| `htmx:historyRestore` | 「戻る」ボタンでページが復元された際、JS の状態がリセットされても確実に履歴を再描画 |

### ③ リアルタイムな履歴クリア

「履歴クリア」関数内で `localStorage.removeItem()` の直後に `renderHistory()` を再実行する。ボタンを押した瞬間に `datalist` の項目がリアルタイムで消える、無駄のない UX を実現する。

### ④ 1件20文字 / 最大5件 / FIFO・LRU 管理

| ルール | 実装方法 |
|:---|:---|
| 20文字制限 | `substring(0, 20)` で保存前にカット |
| 5件制限 | `slice(0, 5)` で常に最新の5件をキープ |
| 順序入れ替え | 既存ワードを `filter` で削除してから先頭に再挿入 |

---

## 3. 将来のデザイン変更（自作 UI）への耐性

**「データ操作（Logic）と DOM 反映（Render）の分離」**

`window.saveKeyword` と `window.renderHistory` は、データを取り扱う「コアロジック」と画面に表示する「レンダリング」を関数内で分けて記述する。

将来 `datalist` を卒業して `div` や `ul` でスタイリッシュな自作ドロップダウンを作る際も、定数やデータ保存のロジックを一切変えることなく、`renderHistory` 内の数行の DOM 操作コードを書き換えるだけで移行が完了する。

---

## 4. 実装直前の最終構成イメージ

### `HeaderSearch.tsx`（抜粋）

~~~tsx
<input
  id="q-input-header"
  list="searchHistoryList"
  autocomplete="off"
  {/* 他の属性は省略 */}
/>
<datalist id="searchHistoryList"></datalist>
<script dangerouslySetInnerHTML={{ __html: headerSearchHistory }} />
~~~

### `headerSearchHistory.ts`（ロジックの核）

~~~javascript
// 定数読み込み（KEY, MAX_COUNT, MAX_CHARS）

// saveKeyword:
//   - 20文字カット（substring）
//   - 重複排除して先頭へ移動（filter → unshift）
//   - 5件制限（slice）
//   - localStorage へ保存後に renderHistory を呼ぶ

// clearAllHistory:
//   - localStorage.removeItem() 後に renderHistory を再実行

// renderHistory:
//   - datalist の option を再構築するのみ
//   - データ取得には一切関与しない（Render 専用）

// ライフサイクル登録:
//   document.addEventListener('DOMContentLoaded', renderHistory)
//   document.addEventListener('htmx:afterSwap', renderHistory)
//   document.addEventListener('htmx:historyRestore', renderHistory)
~~~

---

## アドバイス・懸念事項

### `window` へのアタッチは最小限に

`window.saveKeyword` と `window.clearAllHistory` をグローバルに公開する設計は、`dangerouslySetInnerHTML` 経由でスクリプトを埋め込む場合の現実的な選択肢として正しい。ただし将来的にスクリプトが増えた際の名前衝突を防ぐため、早めに名前空間を切っておくと安全。

~~~javascript
// 名前空間による衝突防止
window.ALT = window.ALT || {};
window.ALT.saveKeyword = (word) => { /* ... */ };
window.ALT.clearAllHistory = () => { /* ... */ };
~~~

### `htmx:afterSwap` は複数回発火することがある

ページ内に複数の HTMX スワップターゲットがある場合、`htmx:afterSwap` はスワップのたびに発火する。`renderHistory` の処理は軽量なので実害は少ないが、気になる場合は `event.detail.target.id` で対象を絞り込むと無駄な再描画を防げる。

~~~javascript
document.addEventListener('htmx:afterSwap', (event) => {
  if (event.detail.target.id === 'search-results-target') {
    renderHistory();
  }
});
~~~

### `datalist` の自作 UI 移行タイミングについて

§3 で言及している「将来の自作ドロップダウン移行」は、iOS Safari での `datalist` の見た目がカスタマイズ不能である点を踏まえると、PWA 対応と同じタイミングで検討する価値がある。モバイルでの見た目が気になり始めたら早めに着手する方が、後の改修コストが低い。

## 実装時のメモ
・1. 案A：入力欄の直下に「隠しリンク」を配置する（推奨）
datalist を使いつつ、「履歴がある時だけ」入力欄のすぐ下に小さな「履歴を削除」というリンクを表示させる方法です。


*document version: v1.0 — last reviewed: 2026-04*