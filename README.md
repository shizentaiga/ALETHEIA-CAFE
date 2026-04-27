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
