# キーワード検索履歴：実装計画 ＆ 完了報告書

---

## 1. 構成ファイルと最終的な役割

保守性と軽量性を両立させるため、定数管理・ロジック・Viewを完全に分離した。

| ファイルパス | 役割 | 備考 |
|:---|:---|:---|
| `src/lib/constants.ts` | **定数管理** | `MAX_COUNT`(5), `MAX_CHARS`(20) 等を定義。 |
| `src/pages/header/headerSearchHistory.ts` | **ロジック** | 文字列化された純粋なJS。HTMXライフサイクル、保存、描画を担当。 |
| `src/pages/header/headerStyle.ts` | **スタイル** | 検索フォームおよびチップのCSS。履歴UIの複雑さを排除したシンプル構成。 |
| `src/pages/header/HeaderSearch.tsx` | **View** | `datalist` を使用した検索インターフェース。 |

---

## 2. 実装済みロジックの設計仕様

### ① ブラウザ干渉の排除（`autocomplete="off"`）
ブラウザ固有の入力履歴が `datalist` と重複して表示されるのを防ぐため、`input` タグに `autocomplete="off"` を明示。これにより、自作の検索履歴のみが提案されるクリーンなUXを実現した。

### ② HTMX ライフサイクルへの完全追従
SPAに近い挙動をするHTMX環境下でも、履歴機能が途切れないよう以下のイベントを捕捉している。

| イベント | 対応内容 |
|:---|:---|
| `DOMContentLoaded` | 初回ページ読み込み時の初期描画。 |
| `htmx:afterSwap` | 検索実行後、ヘッダーを含む要素が動的に書き換わった際の再描画。 |
| `htmx:historyRestore` | 「戻る」ボタンによるページ復元時、JSの実行状態を確実に最新の履歴に同期。 |

### ③ データ管理ルール（FIFO・LRU）
| ルール | 実装詳細 |
|:---|:---|
| **20文字制限** | `substring(0, 20)` により、ストレージ容量を圧迫せず、UIを破壊しない長さにカット。 |
| **5件制限** | `slice(0, 5)` により、常に鮮度の高いキーワードのみを保持。 |
| **LRU順序管理** | 既存キーワードが再入力された場合、`filter` で一度削除してから先頭へ `unshift`。 |

---

## 3. 方針変更と最適化（v1.0 完了報告）

当初検討していた「履歴削除リンク（案A）」は、UIの純粋さと実装の軽量化を優先し、**非採用**とした。

### 変更の理由
1.  **UIの整合性**: `datalist` はOS/ブラウザネイティブの挙動に依存するため、自作の削除リンクと表示タイミングを完全に同期させることが難しく、ノイズになる可能性があった。
2.  **JSエラーの回避**: リンクの有無をチェックする複雑なDOM操作を排除し、`renderHistory` を「datalistを更新するだけ」という単一責任に絞り込むことで、実行時エラーの発生率を最小化した。

---

## 4. 最終構成イメージ

### `HeaderSearch.tsx`（View）
~~~tsx
<input 
  id="q-input-header" 
  list="searchHistoryList" 
  autocomplete="off" 
  /* ... */ 
/>
<datalist id="searchHistoryList"></datalist>
<script dangerouslySetInnerHTML={{ __html: headerSearchHistory }} />
~~~

### `headerSearchHistory.ts`（Logic）
~~~javascript
// 1. renderHistory: datalist の option 要素を構築
// 2. saveKeyword: 入力値をバリデーション、整形、localStorage 保存
// 3. ライフサイクル登録: DOMContentLoaded / htmx:afterSwap / htmx:historyRestore
~~~

---

## 5. 今後の拡張性への備忘録

### 自作 UI（カスタムドロップダウン）への移行
将来的に iOS Safari 等のネイティブな `datalist` の見た目がプロジェクトの意匠と合わなくなった場合でも、`renderHistory` 関数の内部を `div` や `ul` を生成するロジックに書き換えるだけで移行が可能である。データ構造（localStorage）は既に最適化されているため、変更の必要はない。

### 名前空間の導入
現状は `window` 直下にアタッチしているが、将来的にスクリプトの規模が拡大した際は `window.ALETHEIA.search` のような名前空間への移行を検討する。

---
*document version: v1.1 — last updated: 2026-05-03*
*Status: Implemented & Refactored*