# 📂 Project Directory Structure

本プロジェクトは、**Hono + HTMX + Cloudflare D1** をベースとした、高速かつメンテナンス性の高い疎結合アーキテクチャを採用しています。

---

## 1. Application Layer（`src/`）

アプリケーションのコアロジック・UI・リクエスト制御を担います。

### Core & Routing

~~~
src/
├── index.tsx          # エントリポイント。Global Router として全ルーティング・ミドルウェアを統合
├── renderer.tsx       # 基本レイアウト（HTML 外枠）定義
└── middleware/
    └── htmlMinifier.ts  # 本番配信時の HTML / CSS / JS 圧縮処理
~~~

### View & UI（`pages/`, `components/`）

~~~
src/
├── pages/             # ページ全体の構造とコントローラー
│   ├── TopPage.tsx    # メイン画面の統合
│   ├── TopMain.tsx
│   ├── TopHeader.tsx
│   ├── TopFooter.tsx
│   └── header/        # 検索窓・履歴・認証 UI の集約
│       ├── headerSearchHistory.ts  # キーワード履歴管理
│       └── GoogleAuth.ts           # OAuth 2.0 認証ハンドラ
│
└── components/        # HTMX で動的に差し替えられる最小機能単位
    ├── SearchArea.tsx     # エリア選択
    ├── SearchResult.tsx   # 結果一覧
    └── SearchCategory.tsx # 絞り込み
~~~

### Logic & Utilities（`api/`, `lib/`）

~~~
src/
 ├── api/
 │   ├── areaDrilldown.ts
+│   └── attributeSearch.ts # 【新規】特徴選択モーダル/チェックボックスの非同期処理API
 │
 ├── components/
 │   ├── SearchArea.tsx
-│   └── SearchCategory.tsx  # 【削除・置換】
+│   └── SearchAttribute.tsx # 【新規】特徴検索のトリガー、及びモーダル枠の管理
 │
 └── lib/
     ├── geo.ts
     ├── geoUtils.ts
     └── searchUtils.ts     # 【修正】特徴パラメータ(attributes[])の集約・パースロジック
~~~

---

## 2. Data Layer（`src/db/`）

Cloudflare D1（SQLite）のデータ構造とアクセス層を管理します。

~~~
src/db/
├── schema.sql           # データベースのテーブル定義
├── setup.sh             # D1 へのマスタ投入自動化スクリプト
│
├── queries/             # Data Access Object（DAO）
│   ├── main.ts
│   ├── areaQuery.ts
│   ├── searchQuery.ts
│   ├── stationQuery.ts
│   └── transformers.ts
│
└── seed/
    ├── 00_master/       # 基盤マスタ（エリア・駅・路線等）
    ├── brands/          # ★ チェーン店・プロバイダー別 SQL
    │   ├── 00x-1_{provider}.sql      # ベースデータ（工程2:convertから生成）
    │   └── 00x-2_{provider}_geo.sql  # 座標補正データ（工程3:repairから生成）
    └── add_tables/      # スキーマ拡張の履歴
~~~

---

## 3. Data Engineering（`scripts/`）

外部ソースからのデータ取得・加工・SQL 変換を担うオフラインスクリプト群です。

~~~
scripts/
│
├── # Master Generation
├── 000_gen_areas.ts       # 自社エリアマスタの生成
├── 000_gen_stations.ts    # 駅データ.jp（CSV）からの駅マスタ生成
│
├── # Brand ETL Pipeline
├── brands/
│   ├── # ETL Pipeline: Fetch → Convert → Repair
│   ├── 00x-1_{provider}_fetch.ts          # 外部サイトからの店舗データ取得
│   ├── 00x-2_{provider}_convert.ts        # JSON → D1 用 SQL への変換
│   └── 00x-3_{provider}_repair_coords.ts  # 不備のある座標データの補正
│
└── data/
    ├── ekidata/       # 駅データ.jp の一次資料（CSV）
    └── raw/           # 各プロバイダーの生データ（JSON）
~~~

---

## 凡例

| 記号・用語 | 説明 |
|:---|:---|
| HTMX 対応 | `src/api/` および `src/components/` でフロントエンドの動的挙動を実現 |
| エッジ最適化 | `src/middleware/htmlMinifier.ts` により Cloudflare Workers 上での配信パフォーマンスを最大化 |

---
💡 新規機能追加時のワークフロー例
データ準備: scripts/ でデータを取得・変換し、src/db/seed/ に配置。

DB実装: src/db/queries/ に関数を追加し、main.ts から export。

API実装: HTMX から叩く場合は src/api/ にエンドポイントを作成。

UI実装: src/components/ にパーツを作り、src/pages/ で配置。

---
