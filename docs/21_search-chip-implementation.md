# マルチキーワード・チップ検索：本番実装計画書 (v1.1)

---

## 1. 実装の要約

URL クエリパラメータを **唯一の正解（Single Source of Truth）** とし、チップの追加・削除・検索結果の更新を、クライアントサイドの状態管理（React State 等）なしに HTMX と Hono のサーバーサイドロジックのみで完結させる。

---

## 2. 技術キーワード

| 技術概念 | 説明 |
|:---|:---|
| Query-Array Normalization | 複数 `q` パラメータのクレンジングと上限設定 |
| OOB (Out-of-Band) Swaps | メイン更新範囲外のヘッダー要素等を個別に自動更新 |
| Param-Safety Encoding | `URLSearchParams` による安全なクエリ生成 |
| State Persistence | 0件ヒット時でも検索条件（チップ）を維持するサーバーサイド設計 |

---

## 3. 影響範囲と修正内容

### ① Logic 層：`lib/search.ts`

**正規化関数** `getNormalizedKeywords(queries: string | string[])`
- `filter(Boolean)` を徹底し、空文字（空の入力窓からの送信）を完全に除外。
- 重複排除（Set）を行い、順序に依存しない純粋な文字列配列を返す。
- **[追加仕様]** `slice(0, 5)` により、DB 負荷保護のためキーワードを最大 5 つに制限する。

**URL 生成関数** `createSearchUrl(keywords: string[])`
- `URLSearchParams` を使用し、スペースや特殊文字を安全にエンコードした `?q=...` 文字列を生成。
- チップ削除時のリンク生成および `hx-push-url` 用に共用する。

### ② View 層：`pages/header/HeaderSearch.tsx`

**コンポーネント構造**
- チップと入力窓を一つの `<form>` に収容。
- `hx-get=""`（空文字指定）により、現在のエンドポイント（`/_sandbox/test06` 等）を維持したままリクエストを送信。
- **[安定化対策]** ヘッダー自身の更新には `hx-swap-oob="true"` を付与した ID 指定要素を使用し、検索結果エリア（メインターゲット）との同時更新を確実にする。

### ③ Data 層：`db/queries/search.ts`

**動的 SQL 生成**
- キーワード配列が空の場合：デフォルトの「全件」または「初期表示」を返す。
- キーワード配列がある場合（最大 5 つ）：各キーワードに対して `LIKE` 句を生成し、`INTERSECT`（積集合）または `AND` 条件で結合する。

### ④ Controller 層：`pages/TopHeader.tsx` 各エンドポイント

**ステート維持とレスポンス構成**
- 検索結果が 0 件であっても、TopHeader はクエリに基づいた「チップ付き検索窓」を再生成する。
- レスポンスには「検索結果 HTML」と「OOB 指定されたヘッダー HTML」を両方含めて返却する。

---

## 4. 実装ステップ（リスク最小化手順）

### Step 1：環境固定とロジックの実装（`lib/` & `renderer.tsx`）
- `renderer.tsx` の HTMX タグを `v1.9.12` に固定。
- `lib/search.ts` で正規化（最大 5 語制限含む）とエンコード関数を実装。

### Step 2：OOB Swaps の検証（View 層）
- `hx-select` による複数指定ではなく、`hx-swap-oob="true"` を使ってヘッダー内のチップが検索結果と連動して更新されるか確認する。

### Step 3：0件ヒット時の UI 維持テスト（DB 層）
- ヒットしないワードを入力し、結果エリアに「0件」と表示されつつ、ヘッダーのチップから削除（× ボタン）による「条件の緩和」が可能であることを確認する。

---

## 5. 注意点と対策

| 項目 | 対策 |
|:---|:---|
| HTMX バージョン | **v1.9.12 (安定版)** を使用。将来的な v2 系移行を見据え OOB 記法を優先 |
| キーワード上限 | **最大 5 つ**。`lib/search.ts` にて強制スライスし、DB 負荷を一定に保つ |
| 二重送信対策 | `c.req.queries('q')` 取得直後に必ず正規化関数を通す |
| 入力窓クリア | `hx-on="htmx:afterRequest: this.value = ''"` で実装 |
| スクロール復元 | `renderer.tsx` にて `htmx.config.historyEnabled = true` を確認 |

---

## 6. ファイル修正サマリー

| ファイル | 修正のポイント |
|:---|:---|
| `lib/search.ts` | 正規化（5 語制限）＋安全な URL エンコード関数の追加 |
| `HeaderSearch.tsx` | フォーム構成の変更、`hx-swap-oob` 属性の付与 |
| `search.ts`（DB） | 最大 5 語までの動的 `LIKE` クエリの実装 |
| `renderer.tsx` | HTMX バージョン固定（1.9.12）と履歴・スクロール設定 |

---
*document version: v1.1 — updated: 2026-05 (Taiga Tshizen)*