1. 開発・運用コマンド
アプリケーション実行
npm run dev: ローカル開発サーバー（Wrangler Pages/Workers）の起動
npm run deploy: Cloudflare 本番環境へのデプロイ
npx wrangler tail: 本番環境のリアルタイムログ監視

# ALETHEIA-CAFE

## Project Overview
ALETHEIA-PROTOの課題（密結合）を解消するための、疎結合な予約管理システム。

## Tech Stack
- Hono / TypeScript
- Vite / Cloudflare Workers
- D1 (予定)