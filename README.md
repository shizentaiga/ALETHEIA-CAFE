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

### ディレクトリ構成

- **src/**
  - **index.tsx**: アプリケーション全体のメインエントリ。ルーティングとミドルウェアの制御を担当。
  - **renderer.tsx**: 全ページ共通のHTML構造を定義する共通レンダラー。HTMXの読み込みやグローバルスタイルの管理。
  - **pages/**: 各画面を構成するコンポーネント集。
    - **TopPage.tsx**: トップページのメインオーケストレーター。
    - **TopHeader.tsx**: 透過背景とセリフ体ロゴを持つヘッダー。
    - **TopMain.tsx**: 検索機能やメインコンテンツ。
    - **TopFooter.tsx**: 画面最下部に固定（Sticky Footer）されるフッター。

- **public/**: 静的資産の格納場所。
  - **style.css**: プロジェクト全体の外部CSS。

### 設計方針

1. **Atomic Component Separation**: 
   各パーツ（Header, Main, Footer）を独立したファイルとして定義し、`TopPage.tsx` で統合することで、メンテナンス性と可読性を高めています。
   
2. **Sticky Footer Architecture**: 
   コンテンツ量に関わらず、フッターが常に画面最下部に位置するよう、Flexboxを用いたレイアウト設計を `renderer.tsx` レベルで実装しています。

3. **Future Scalability**: 
   現在は単一階層ですが、今後 `mypage` や `shop` などの新機能が追加される際は、`pages/` 配下にそれぞれのサブディレクトリを作成し、同様の構成（Header, Main, Footer）を展開する設計思想です。