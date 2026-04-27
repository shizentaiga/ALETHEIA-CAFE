# 02_Oauth2.0.md - Google OAuth 2.0 実装ガイド

このドキュメントでは、Cloudflare Workers (Hono) 環境における Google OAuth 2.0 認証の実装プロセスと、トラブルシューティングの記録を管理します。

## 1. 技術スタック・概要
- **Framework**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Identity Provider**: Google Cloud Console (OAuth 2.0)
- **ID Strategy**: `user_id` = Google `sub` (永続的一意識別子) を採用

---

## 2. 環境変数の管理マトリックス
認証情報は、動作環境によって保存場所が異なるため、厳格に管理する必要があります。

| 項目 | 変数名 | 保存場所 (ローカル) | 保存場所 (リモート) | 性質 |
| :--- | :--- | :--- | :--- | :--- |
| クライアントID | `GOOGLE_CLIENT_ID` | `wrangler.jsonc` (vars) | `wrangler.jsonc` (vars) | 公開値（共有） |
| シークレットキー | `GOOGLE_CLIENT_SECRET` | `.dev.vars` | Cloudflare Dashboard (Secrets) | 秘匿値（暗号化） |

> **注意**: `.dev.vars` は Git 管理から除外し、リモートの Secret は GUI または `wrangler secret put` でのみ設定します。

---

## 3. 実装上の重要チェックポイント

### ① パスの動的解決 (Relative Path Issue)
Hono のルーティング階層（例: `/_sandbox/test02`）で動作させる場合、リンクを `./auth/google` のように相対記述すると、現在のURL末尾の `/` の有無で遷移先がズレる問題が発生します。

- **解決策**: `c.req.path` からベースパスを取得し、`${basePath}/auth/google` のように絶対パスに近い形でリンクを生成する。
- **Redirect URI**: コールバック後の戻り先も、`c.req.path` を基に動的に構築することで、環境（test01/test02/本番）を選ばない実装にする。

### ② Google Cloud Console の設定
Google 側はセキュリティ上、リダイレクト先を厳格に照合します。

- **承認済みのリダイレクト URI**:
  - `http://localhost:5173/_sandbox/test02/auth/google/callback` (開発用)
  - `https://[your-worker].workers.dev/_sandbox/test02/auth/google/callback` (本番用)
- **エラー 401: invalid_client**: クライアントIDが `wrangler.jsonc` 等に正しく反映されていない場合に発生。

### ③ データベース (D1) の整合性
スキーマ定義（`schema.sql`）とコード内の SQL 文が一致している必要があります。

- **論理削除**: `status` カラムを `'ACTIVE' / 'DELETED'` の文字列で管理し、退会時は `deleted_at` にタイムスタンプを付与。
- **リモート適用**: 本番環境への反映には必ず `--remote` フラグを付けて実行すること。
  ```bash
  npx wrangler d1 execute ALETHEIA_CAFE_DB --file=./src/db/schema.sql --remote