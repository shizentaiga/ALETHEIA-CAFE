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
## 🔍 検索クエリパラメータ仕様

システム全体で引き回す検索条件のURLパラメータ定義です。

### 1. パラメータ一覧

| パラメータ名 | 型 | 例 | 概要・挙動・デフォルト値 |
| :--- | :--- | :--- | :--- |
| `q` | string | q=スターバックス | フリーワード検索（店舗名、住所等）。未指定時は全件対象。 |
| `area` | string | area=10-13-A001 | エリアコード（階層化されたID）。未指定時は全国対象。 |
| `parent_id` | string | parent_id=10 | エリア検索のドリルダウンの制御用。画面の開閉状態を維持するために使用。 |
| `areaName` | string | areaName=東京都 | 画面に表示する「論理名（文言）」。バックエンドのクエリには影響しない。 |
| `attrs` | string[] | attrs=wifi&attrs=outlets | 特徴フラグ（DBの attributes_json 内のキーと対応）。複数指定時はAND検索。 |

### 2. URLサンプルとデコード結果

実際にシステム内で生成されるURLの例です。

■ 実際のURL（ブラウザの環境など）
http://localhost:5173/?areaName=%E6%9D%B1%E4%BA%AC%E9%83%BD&q=%E3%83%9F%E3%82%B9%E3%82%BF%E3%83%BC%E3%83%89%E3%83%BC%E3%83%8A%E3%83%84&area=10-13-A001&parent_id=10-13-A001

■ 解析結果（デコード後）
{
  "areaName": "東京都",
  "q": "ミスタードーナツ",
  "area": "10-13-A001",
  "parent_id": "10-13-A001"
}

### 3. 仕様上の注意点

・areaName の役割
ページのリロードやリンクのシェア時に、画面上のボタンやチップに「東京都」等の文字を再描画するために用意されています（これがないと、area コードから地名をDB再取得する必要が出てしまうため）。

・attrs の複数指定時の挙動
attrs=wifi&attrs=outlets のように同じキーで複数並んだ場合、配列として受け取ります。バックエンド側では、attributes_json 内の各フラグがすべて true であるものを対象とする「AND条件」としてSQLを組み立てます。

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
| 0 | **プロジェクト構造定義書** | `docs/00_directory-structure.md` | フォルダ構成、各レイヤーの責務、ファイルの配置規則。 |
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