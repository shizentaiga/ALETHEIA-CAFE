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
| 0 | **プロジェクト構造定義書** | `00_directory-structure.md` | フォルダ構成、各レイヤーの責務、ファイルの配置規則。 |
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