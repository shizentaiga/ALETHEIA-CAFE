# ALETHEIA-CAFE プロジェクトセットアップ記録
作成日: 2026-04-27
ステータス: 環境構築完了

## 1. 概要
ALETHEIA-PROTOの課題（密結合）を解消するため、Hono/Vite/TypeScriptを用いた疎結合な設計のベースを構築する。

## 2. 環境構築手順
### ① プロジェクトの初期化
ターミナルにて以下のコマンドを実行。
- `npm create hono@latest .`
- テンプレート: `cloudflare-workers+vite` を選択。

### ② Git/GitHub 連携
- `.gitignore` の設定（`.DS_Store` や `.env`、`.wrangler` 等の除外）。
- GitHub上に新規リポジトリ `ALETHEIA-CAFE` を作成。
- ローカルから `git remote add` で紐付けし、Initial Commitをプッシュ。

## 3. 重要：トラブルシューティングと対策
本日の作業で発生した課題と、その解決策を以下に記録する。

### A. Wranglerでのログインエラー
- **事象:** `npx wrangler login` 実行時、ブラウザとの認証連携ができずログインエラーが発生。
- **対策:** 開発効率と安定性を優先し、CloudflareのGUI（ダッシュボード）からGitHubリポジトリを直接連携する「Git接続」方式を採用。

### B. Cloudflare Pagesでのリポジトリ反映
- **事象:** GitHubにリポジトリを作成した直後、Cloudflare Pagesの選択画面に該当リポジトリが表示されない。
- **対策:** 数分程度のタイムラグがあるため、反映を待ってから再度読み込むことで解決。

### C. プロジェクト名の命名規則
- **事象:** GitHubリポジトリ名は `ALETHEIA-CAFE` と大文字を含めていたが、Cloudflareのプロジェクト名は小文字のみの制約がある。
- **対策:** Cloudflare側では `aletheia-cafe` と命名。内部設定の `wrangler.json` の `name` も小文字で統一。

## 4. デプロイ設定（ビルド詳細）
Cloudflare Pages 連携時の設定値：
- **フレームワークプリセット:** None
- **ビルドコマンド:** `npm run build`
- **ビルド出力ディレクトリ:** `dist`

## 5. 次回の作業
- `src/index.tsx` の整理。
- `Top.tsx` および `_sandbox` フォルダの作成と配置。
- CSS/JSの依存関係を整理したレンダラーの検討。