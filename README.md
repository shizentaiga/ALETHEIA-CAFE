# ALETHEIA-CAFE

疎結合な予約管理システムのプロトタイプ。ALETHEIA-PROTO の課題（密結合）を解消し、機能追加・変更に強い構造を目指す。

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

---
# プロジェクト構成 (Source Directory Structure)

## src/
- **index.tsx**: エントリポイント。Hono によるルーティング定義とリクエスト集約。
- **renderer.tsx**: 全ページ共通の HTML 外枠・メタデータ定義。

### 📂 pages/ (View & Page Controllers)
ページ全体のレイアウトと、特定ページに紐づくロジックを管理。
- **TopPage.tsx / TopMain.tsx**: トップページのメイン構造と共通レイアウト。
- **TopHeader.tsx / TopFooter.tsx**: サイトのヘッダー・フッター統合。
- **header/**: 
    - `HeaderSearch.tsx`: 検索窓・履歴管理（`headerSearchHistory.ts`）を含む検索コア。
    - `HeaderAuth.tsx`: 認証状態に応じた UI 表示。
- **GoogleAuth.ts**: Google 認証のフロントエンド・ハンドラ。

### 📂 components/ (UI Parts)
HTMX で動的に差し替えられる、機能単位の UI コンポーネント。
- **SearchArea.tsx**: エリアドリルダウン検索のトリガーおよび初期表示。
- **SearchResult.tsx**: 店舗検索結果の一覧表示（HTMX ターゲット）。
- **SearchCategory.tsx**: カテゴリ選択・絞り込み UI。

### 📂 api/ (HTMX Endpoints)
HTMX からのリクエストに対して、部分的な HTML 破片（Fragments）を返却するロジック。
- **areaDrilldown.ts**: エリア選択の次階層データを返却するコアロジック。
- **areaHandler.ts**: エリア関連の汎用リクエスト・ハンドリング。

### 📂 db/ (Data Layer)
Cloudflare D1 関連のスキーマ、クエリ、およびシードデータ。
- **queries/**: 
    - `areaQuery.ts`: エリアマスタ（`areas` テーブル）操作専用。
    - `searchQuery.ts`: 店舗情報の複雑な検索・フィルタリング。
    - `main.ts`: クエリ層の統合エクスポート窓口。
- **seed/**: マスタデータ（`areas.sql`）、チェーン店（Starbucks/Doutor）、地域別店舗データの SQL 資産。
- **add_tables/**: 拡張用スキーマ変更履歴（`add_areas_table.sql`等）。

### 📂 lib/ (Shared Utilities)
特定の View に依存しない、純粋なロジックや共通定数。
- **searchUtils.ts**: URL パラメータ（area, q）の同期と、検索状態の維持ロジック。
- **geo.ts / geoUtils.ts**: 現在地座標の解決や、距離計算等の地理情報処理。
- **auth.ts / constants.ts**: 認証の低レイヤー処理および、地理情報・UI 用定数。

~~~
public/
└── icon.svg               # 共通アイコン
~~~

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

*© 2026 Taiga Shizen. ALETHEIA-CAFE is part of the shizentaiga-2026 project.*