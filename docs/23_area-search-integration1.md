# エリア検索（市区町村拡張）＆ 現在地連携：実装計画書 (v3.0)

## 1. 設計思想：階層と自由度の両立
- **階層化 ID (area_id) の活用**: `area_id` の前方一致（例: `10-08%`）により、親IDカラムを持たずとも高速に階層クエリを実行する。
- **Level による深度制御**: `area_level` (1:大, 2:中, 3:小) を活用し、ドリルダウンのステップを動的に生成。
- **Single Source of Truth**: 地理情報はすべて `areas` テーブルに集約し、ハードコードを排除する。

---

## 2. 修正・影響ファイル一覧

| カテゴリ | 物理パス | 区分 | 内容 |
| :--- | :--- | :--- | :--- |
| **Data** | `db/seed/areas.sql` | 完了 | `area_id` 階層、`area_level`、座標を含む全マスタの投入。 |
| **DB** | `db/queries/areaQuery.ts` | 新規 | エリアマスタ取得用の D1 クエリ関数群。 |
| **Logic** | `lib/searchUtils.ts` | 更新 | `area_id` から SQL の `LIKE` 句を生成する判定ヘルパー。 |
| **Shared** | `lib/geoUtils.ts` | 新規 | 現在地座標から最短距離のエリアレコードを特定するロジック。 |
| **API** | `api/areaDrilldown.ts` | 新規 | `parent_id` を受け取り、下位エリアのリストを返すエンドポイント。 |
| **UI** | `components/SearchArea.tsx` | 更新 | 3 連プルダウンの HTMX 実装および現在地連携。 |

---

## 3. 実装ロードマップ（更新順序）

デグレとビルドエラーを防ぐため、**「データ取得層 → ロジック層 → 外部接続層 → UI層」**の順でボトムアップに実装します。

### Phase 1: データ・ロジック基盤の整備
1. **`db/queries/areaQuery.ts` の作成**  
   - 特定の `parent_id` に紐づく子階層を取得する関数、および座標から最近傍エリアを取得する関数を定義。
   - `db/queries/main.ts` から上記を export し、プロジェクト全体から参照可能にする。
2. **`lib/searchUtils.ts` の更新**  
   - 渡された `area_id` の桁数やハイフンの数から `area_level` を判定し、検索用の `LIKE` パターンを生成する純粋関数を実装。
3. **`lib/geoUtils.ts` の作成**  
   - ブラウザから取得した座標を `areaQuery` に引き渡すための前処理ロジックを実装。

### Phase 2: エンドポイントの構築
1. **`api/areaDrilldown.ts` の作成**  
   - `areaQuery` を呼び出し、HTMX 用の `option` タグ（または `AreaList.tsx`）を返すルーティングを定義。
2. **`src/index.tsx` へのルート登録**  
   - 既存のルーティングを壊さないよう、`app.route()` を使用して新しいエンドポイントをマウント。

### Phase 3: UI 実装と結合テスト
1. **`components/SearchArea.tsx` の更新**  
   - 既存のプルダウンに `hx-get` 属性を追加し、`api/areaDrilldown.ts` と接続。
   - 1 つ上の階層が変更された際、下位のプルダウンが初期化・更新されるよう HTMX のトリガーを設定。
2. **現在地ボタンの連動**  
   - `navigator.geolocation` で取得した座標を `api` へ飛ばし、返ってきた `area_id` に基づいて各プルダウンの `value` を同期させるスクリプトを追記。

---

## 4. 完了定義
- [x] `areas` テーブルが ID 階層構造で定義・デプロイされている。
- [ ] 地方 > 都道府県 > 市区町村の 3 連ドリルダウンがビルドエラーなく動作する。
- [ ] エリア選択時、上位階層（すべて）でも下位階層でも適切な検索結果が返る。
- [ ] 現在地ボタン押下後、最短距離の市区町村 `area_id` が自動選択される。
- [ ] 旧カラム `pref`, `city` を参照している箇所がすべて `area_id` に置換されている。

---
*document version: v3.0 — last updated: 2026-05-04*