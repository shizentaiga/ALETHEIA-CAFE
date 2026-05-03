# エリア検索・現在地連携：統合実装計画書 (v2.0)

## 1. 改訂のポイント：ゼロ・レイテンシ & ファイル依存関係の最適化
- **DBファースト**: D1に座標データを統合し、検索の「核」をサーバーサイドに構築。
- **コンポーネント分離**: 現在地ボタンのUIを `SearchArea.tsx` に統合し、動線を最適化。
- **URL同期の徹底**: `searchUtils.ts` で `area=auto:{id}` のパースを統一管理。

---

## 2. 修正・影響ファイル一覧

| カテゴリ | 影響ファイル | 修正内容 |
| :--- | :--- | :--- |
| **Data** | `db/schema.sql` | `areas` テーブルに `lat`, `lng` カラムを追加。 |
| | `db/seed/` | 市区町村の代表点（座標）データの投入。 |
| | `db/queries/searchQuery.ts` | 座標指定による「最寄エリア特定クエリ」の追加。 |
| **Shared** | `lib/searchUtils.ts` | `auto:` セパレータのパース、距離計算ロジックの追加。 |
| **UI** | `components/SearchArea.tsx` | ドリルダウン横への「⊕」ボタン配置、現在地取得JSの注入。 |
| | `pages/header/headerStyle.ts` | 現在地ボタン（⊕）およびローディング中のアニメーション定義。 |
| **API** | `api/areaHandler.ts` | 座標を受け取り、最寄りのエリアIDを返すエンドポイントの検討。 |

---

## 3. 実装ロードマップ（推奨順序）

### Step 1: データ基盤の整備（Data Layer）
1. **`schema.sql`**: `areas` テーブルを拡張。
2. **`seed`データ**: 主要な市区町村（江戸川区等）の緯度・経度をマスタに登録。
3. **`searchQuery.ts`**: `areaId` を元にした絞り込み、および座標から最寄IDを引くロジックの準備。

### Step 2: 共通ロジックの実装（Logic Layer）
1. **`searchUtils.ts`**: 
   - `parseAreaParam` の強化（NaN対策、`isAuto` フラグ判定）。
   - クライアント側での簡易距離計算（三平方の定理）関数の追加。

### Step 3: UIの実装と現在地取得の統合（View Layer）
1. **`SearchArea.tsx`**: 
   - ドリルダウンの横に `⊕` ボタンを配置。
   - `navigator.geolocation` を呼び出すクライアントサイドJSを実装。
2. **`headerStyle.ts`**: 
   - ⊕ ボタンのスタイル、および `is-loading` 時の回転アニメーションを定義。

### Step 4: 動作確認とデグレチェック
1. **`HeaderSearch.tsx` との連携**: キーワード入力時、`area` パラメータが `hidden` フィールドで正しく引き継がれているか確認。
2. **HTMX ライフサイクル**: 現在地確定後の `/?area=auto:{id}` への遷移と、部分スワップの整合性を確認。

---

## 4. 具体的実装のヒント

### ⊕ ボタンの配置イメージ（SearchArea.tsx）
~~~tsx
<div class="search-area-container">
  <div class="search-area-module">
    {/* 既存のドリルダウン */}
  </div>
  <button 
    id="geo-trigger" 
    class="geo-btn" 
    onclick="handleGeoLocation()"
    title="現在地から探す"
  >
    ⊕
  </button>
</div>
~~~

### パース処理の安全性（searchUtils.ts）
~~~typescript
export const parseArea = (val?: string) => {
  if (!val) return { id: null, isAuto: false };
  const [prefix, idPart] = val.includes(':') ? val.split(':') : [null, val];
  const id = parseInt(idPart, 10);
  return {
    id: Number.isFinite(id) ? id : null,
    isAuto: prefix === 'auto'
  };
};
~~~

---

## 5. 検討事項と対策まとめ

- **DB検索の最適化**: エリア数が少なければクライアントサイド計算で十分だが、全国展開時は `db/queries/` 内で SQL による距離ソートを行う方がペイロードを節約できる。
- **逆ジオコーディング**: 必要に応じて `HeartRails API` を呼び出す処理を `api/areaHandler.ts` に実装し、座標から「駅名」等の詳細情報を補足する拡張余地を残す。
- **名称の整合性**: `v1.9` までの議論通り、UI上は「現在地（〇〇市）」と表示し、ユーザーに位置認識のフィードバックを与える。

*document version: v2.0 — last updated: 2026-05-03*