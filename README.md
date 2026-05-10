# ALETHEIA-CAFE

**「つながりは、偶然から。」**

Aletheia-Cafe は、「人・時間・場所」を掛け合わせ、その瞬間のニーズに最もフィットする空間を提案する次世代型カフェ検索システムです。

## 🌟 Core Search Logic
* **人 (Who):** 子連れから一人作業まで、利用シーンに応じたマッチング
* **時間 (When):** 営業時間や混雑傾向に基づくスマートな提案
* **場所 (Where):** 最寄駅の表示

## 🎯 Targeted Needs
* **Family:** 赤ちゃんOK、ベビーカー入店可、キッズメニュー完備
* **Experience:** ビュッフェ・食べ放題形式、ワークショップ開催
* **Business/Solo:** 静かな集中環境、電源・Wi-Fi、テレワーク推奨エリア

---

## Tech Stack

| カテゴリ | 技術 |
|:---|:---|
| Framework | Hono（Vite 版） |
| Runtime | Cloudflare Workers / Pages |
| Language | TypeScript |
| Stack | Hono, HTMX, Tailwind / CSS-in-JS |
| Database | Cloudflare D1 |

---

## Architecture Design

`index.tsx` を「ハブ」として機能させ、各ページや機能のロジックを完全に分離する疎結合設計を採用。

| レイヤー | ファイル | 責務 |
|:---|:---|:---|
| Global Router | `src/index.tsx` | ルーティングと共通ミドルウェアの定義のみ |
| Renderer | `src/renderer.tsx` | 全ページ共通の HTML 構造（額縁）を管理 |
| Pages | `src/pages/` | ページ単位のロジックとディレクトリベースの部品管理 |
| Sandbox | `src/_sandbox/` | 新機能・コンポーネントを試作する実験場 |

# プロジェクト構成 (Source Directory Structure)

---

## ディレクトリ概要

| ディレクトリ / ファイル | 役割 |
|------------------------|------|
| `public/` | 静的アセット |
| `src/index.tsx` | エントリポイント・ルーティング定義 |
| `src/renderer.tsx` | 全ページ共通の HTML 外枠・メタデータ |
| `src/pages/` | ページレイアウトとページ固有ロジック |
| `src/components/` | HTMX で差し替える機能単位の UI パーツ |
| `src/api/` | HTMX エンドポイント（HTML Fragment 返却） |
| `src/db/` | D1 スキーマ・クエリ・シードデータ |
| `src/lib/` | View に依存しない共通ロジック・定数 |
| `scripts/` | データ生成・変換スクリプト群 |

---

## src/

```
src/
├── index.tsx           # エントリポイント。Hono によるルーティング定義とリクエスト集約
├── renderer.tsx        # 全ページ共通の HTML 外枠・メタデータ定義
│
├── pages/              # View & Page Controllers
│   ├── TopPage.tsx     # トップページのメイン構造
│   ├── TopMain.tsx     # 共通レイアウト
│   ├── TopHeader.tsx   # サイトヘッダー統合
│   ├── TopFooter.tsx   # サイトフッター統合
│   ├── GoogleAuth.ts   # Google 認証のフロントエンド・ハンドラ
│   └── header/
│       ├── HeaderSearch.tsx  # 検索窓・履歴管理（headerSearchHistory.ts を含む検索コア）
│       └── HeaderAuth.tsx    # 認証状態に応じた UI 表示
│
├── components/         # UI Parts（HTMX で動的に差し替えられる機能単位）
│   ├── SearchArea.tsx      # エリアドリルダウン検索のトリガーおよび初期表示
│   ├── SearchResult.tsx    # 店舗検索結果の一覧表示（HTMX ターゲット）
│   └── SearchCategory.tsx  # カテゴリ選択・絞り込み UI
│
├── api/                # HTMX Endpoints（HTML Fragment を返却するロジック）
│   ├── areaDrilldown.ts    # エリア選択の次階層データを返却するコアロジック
│   └── areaHandler.ts      # エリア関連の汎用リクエスト・ハンドリング
│
├── db/                 # Data Layer（Cloudflare D1）
│   ├── schema.sql
│   ├── setup.sh            # 【更新予定】新規マスタの投入順序を追記
│   ├── queries/
│   │   ├── areaQuery.ts        # エリアマスタ（areas テーブル）操作専用
│   │   ├── searchQuery.ts      # 店舗情報の複雑な検索・フィルタリング
│   │   ├── transformers.ts
│   │   ├── utils.ts
│   │   ├── main.ts             # クエリ層の統合エクスポート窓口
│   │   └── + stationQuery.ts   # 【新規】座標からの最寄駅計算、駅名検索ロジック
│   ├── seed/
│   │   ├── 00_master/
│   │   │   ├── areas.sql
│   │   │   ├── + stations.sql  # 【新規】駅マスタデータ
│   │   │   ├── + lines.sql     # 【新規】路線マスタデータ
│   │   │   └── + companies.sql # 【新規】鉄道会社マスタデータ
│   │   ├── chains/             # チェーン店データ（Starbucks / Doutor 等）
│   │   └── shops/              # 地域別店舗データ
│   └── add_tables/             # 拡張用スキーマ変更履歴
│       ├── add_areas_table.sql
│       └── + add_stations_tables.sql  # 【新規】駅・路線・接続情報のスキーマ定義
│
└── lib/                # Shared Utilities（View に依存しない純粋なロジック・定数）
    ├── searchUtils.ts      # URL パラメータ（area, q）の同期と検索状態の維持
    ├── geo.ts              # 現在地座標の解決・地理情報処理
    ├── geoUtils.ts         # 距離計算等のユーティリティ
    ├── auth.ts             # 認証の低レイヤー処理
    └── constants.ts        # 地理情報・UI 用定数
```

---

## scripts/

```
scripts/
├── 000_gen_areas.ts          # エリアマスタ生成
├── + 000_gen_stations.ts     # 【新規】駅・路線マスタ生成（ekidata ソース）
├── 00x_{provider}_fetch.ts   # 各ショップデータの取得スクリプト（順次追加）
│                             #   例: 001_starbucks_fetch.ts, 002_doutor_fetch.ts ...
├── 00x_{provider}_convert.ts # 各ショップデータの SQL 変換スクリプト（順次追加）
├── utils.ts                  # 共通ユーティリティ（CSV パース・型定義等）
└── data/
    ├── ekidata/              # 駅データ.jp 提供の一次資料（CSV）
    │   └── *.csv
    └── raw/                  # 取得済みショップデータの中間ファイル
        └── 00x_{provider}.json
```

---

## 凡例

| 記号 | 意味 |
|------|------|
| `+` | 新規追加ファイル（最寄駅検索対応） |
| 【新規】 | 新規作成 |
| 【更新予定】 | 既存ファイルへの追記・変更が必要 |

---

## Design Principles

### 1. Atomic Component Separation
各パーツ（Header / Main / Footer）を独立させ、さらに Header 等の複雑なパーツはサブディレクトリ（`header/`）でスタイルとロジックを分離。

### 2. Zero-JS Focus (with HTMX & Vanilla)
HTMX を活用しつつ、パフォーマンスと SEO を重視。

### 3. High Performance & Scalability
Cloudflare D1 や Workers の特性を活かし、低コストかつ PageSpeed Insights で高得点を維持できる軽量なアーキテクチャ。

---

## Documentation System

プロジェクトの理解とメンテナンスを容易にするため、以下の順序でドキュメントを参照することを推奨する。

| 順序 | 書類名 | ファイルパス | 内容 |
|:---|:---|:---|:---|
| 1 | **README** | `README.md` | 本資料。プロジェクトの概要と全体像。 |
| 2 | **システム設計書** | `docs/01_system-design.md` | コンポーネント間連携と HTMX 状態遷移の定義。 |
| 3 | **データベース設計書** | `docs/02_db-schema.md` | `area_id` 階層管理を含むテーブル定義とデータ構造。 |
| 4 | **移行計画書** | `docs/03_migration-plan.md` | `pref/city` から `area_id` への移行手順と整合性担保。 |

---

## Development & Ops

| コマンド | 用途 |
|:---|:---|
| `npm run dev` | ローカル開発サーバー起動 |
| `npm run deploy` | Cloudflare Pages へのデプロイ |
| `npx wrangler tail` | リアルタイムログ監視 |

---

## Notes

- `header/styles.ts` のように、CSS を外部変数化することで JSX 側の可読性を確保。
- 検索窓のキーワード追加仕様については、ユーザーの絞り込み体験（AND検索）向上のため継続検討中。
- エリア検索は `area_id` による前方一致検索を採用し、北海道等の複雑な階層構造に対応。

---

*© 2026 ALETHEIA-CAFE*