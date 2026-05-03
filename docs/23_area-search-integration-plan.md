# エリア検索（市区町村拡張）＆ 現在地連携：実装計画書 (v3.0)

## 1. 設計思想：階層と自由度の両立
- **階層化 ID (area_id) の活用**: `area_id` の前方一致（例: `10-08%`）により、`parent_id` カラムを持たずとも高速に階層クエリを実行する。
- **Level による深度制御**: `area_level` (1:大, 2:中, 3:小) を活用し、ドリルダウンのステップ（地方 > 都道府県 > 市区町村）を動的に生成。
- **Single Source of Truth**: 地理情報はすべて `areas` テーブルに集約し、`constants.ts` 等のハードコードを排除する。

---

## 2. ドリルダウンの UI/UX 再設計

ユーザーが迷わないよう、3 つの `<select>` 要素を連動（HTMX 等）させて構成する。

| ステップ | 対象の area_level | フィルタ条件 (area_id) | 備考 |
| :--- | :--- | :--- | :--- |
| **1. 地方** | `1` | なし (全取得) | 関東、近畿など |
| **2. 都道府県** | `2` | `LIKE '[Step1]-%'` | 東京都、神奈川県など |
| **3. 市区町村** | `3` | `LIKE '[Step2]-%'` | 江戸川区、新宿区など |

- **「すべて」の動的挿入**: 
  - 各ステップの先頭に「[親エリア名] すべて」を選択肢として追加。
  - 「東京都すべて」が選ばれた場合は、`area_id = '10-08'`（Level 2 の ID）を検索条件とする。
- **URL パラメータ**: `?area_id=10-08`（都道府県レベル）や `?area_id=10-08-A001`（市区町村レベル）を保持。

---

## 3. 修正・影響ファイル一覧（更新版）

| カテゴリ | 影響ファイル | 修正内容 |
| :--- | :--- | :--- |
| **Data** | `db/seed/areas.sql` | 【完了】`area_id` 階層、`area_level`、代表点座標を含む全マスタの投入。 |
| **Logic** | `lib/searchUtils.ts` | 渡された `area_id` がどの階層か判定し、SQL の `LIKE` 句を生成するヘルパー。 |
| **UI** | `components/SearchArea.tsx` | 3 連プルダウンの実装。HTMX による `hx-get` で下位エリアを動的ロード。 |
| **API** | `api/areas/index.ts` | クエリパラメータ `parent_id` を受け取り、直下の子要素リストを返すエンドポイント。 |
| **Shared** | `lib/geoUtils.ts` | 現在地から `area_level = 3` の最短距離レコードを特定する計算ロジック。 |

---

## 4. 実装ロードマップ

### Step 1: ドリルダウン用 API の構築 (HTMX 連携)
1. **API 実装**: `GET /api/areas?parent=10-08` に対して、`area_id LIKE '10-08-%' AND area_level = 3` を返す。
2. **UI 実装**: 都道府県が選択されたら、市区町村プルダウンを `hx-target` で置換・有効化する。

### Step 2: 階層検索ロジックの統合 (Backend)
1. `fetchServices` の修正:
   - 選択された `area_id` が Level 1 または 2 の場合: `WHERE area_id LIKE ? || '%'`
   - 選択された `area_id` が Level 3 の場合: `WHERE area_id = ?`
   - これにより「東京都すべて」でも「江戸川区」でも同一ロジックで処理可能にする。

### Step 3: 現在地計算の精緻化 (Geo Logic)
1. **最寄判定**: `navigator.geolocation` の座標と、`areas` テーブル（`area_level = 3`）を距離演算で照合。
2. **自動セット**: 特定した `area_id` に基づき、UI のプルダウン状態を JavaScript で強制同期させる。

---

## 5. 具体的実装のヒント

### SQL: 階層を跨いだ検索
~~~sql
-- 東京都(10-08)以下の全店舗を検索する場合
SELECT * FROM services 
WHERE area_id LIKE '10-08' || '%'
~~~

### JS: 現在地からの最寄りエリア特定
~~~typescript
// SQLでの距離近似計算
const nearest = await db.prepare(`
  SELECT area_id, name 
  FROM areas 
  WHERE area_level = 3 
  ORDER BY (lat - ?) * (lat - ?) + (lng - ?) * (lng - ?) ASC 
  LIMIT 1
`).bind(lat, lat, lng, lng).first();
~~~

---

## 6. 完了定義
- [x] `areas` テーブルが ID 階層構造で定義・デプロイされている。
- [ ] 地方 > 都道府県 > 市区町村の 3 連ドリルダウンが動作する。
- [ ] 現在地ボタン押下後、最短距離の市区町村 `area_id` が自動選択される。
- [ ] 旧カラム `pref`, `city` が `services` テーブルから物理削除されている。

---

*document version: v3.0 — last updated: 2026-05-04*