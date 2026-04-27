# ALETHEIA-CAFE

## Project Overview
ALETHEIA-PROTOの課題（密結合）を解消し、機能追加や変更に強い構造を目指す、疎結合な予約管理システムのプロトタイプ。

## Tech Stack
- **Framework:** Hono (Vite版)
- **Runtime:** Cloudflare Workers / Pages
- **Language:** TypeScript
- **Database:** Cloudflare D1 (実装予定)

## Architecture Design
本プロジェクトでは、`index.tsx` を「ハブ」として機能させ、各ページや機能のロジックを完全に分離する疎結合設計を採用しています。

- **Global Router (`src/index.tsx`):** ルーティングと共通ミドルウェアの定義のみを担当。
- **Renderer (`src/renderer.tsx`):** 全ページ共通のHTML構造（CSS読み込み等）を管理する「額縁」。
- **Pages (`src/pages/`):** ページ単位のロジックをカプセル化。
- **Sandbox (`src/_sandbox/`):** 本番環境を汚さずに新機能やコンポーネントを試作する実験場。

## Development & Ops
プロジェクトの起動・運用に関する基本コマンド。

- **npm run dev:** ローカル開発サーバーの起動
- **npm run deploy:** Cloudflare 本番環境（Pages）へのデプロイ
- **npx wrangler tail:** 本番環境のリアルタイムログ監視

## Troubleshooting History (2026-04-27)
セットアップ時に発生した課題と解決策：

1. **Wrangler ログインエラー:**
   - 状況: `npx wrangler login` がネットワーク環境により失敗。
   - 対策: CloudflareダッシュボードからGitHubリポジトリを直接連携する「Git接続」方式へ切り替え。
2. **リポジトリ名の命名規則:**
   - 状況: GitHub（大文字可）とCloudflare（小文字限定）でプロジェクト名の不整合が発生。
   - 対策: Cloudflare側の制約に合わせ、プロジェクト名および `wrangler.json` 内の `name` を `aletheia-cafe` に統一。
3. **Renderer の適用ルール:**
   - 状況: `c.html` を使うと共通デザインが当たらない。
   - 対策: 本番・サンドボックス共に `c.render` を使用するルールに統一し、環境の乖離を最小化。