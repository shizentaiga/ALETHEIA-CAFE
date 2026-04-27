# 02_Oauth2.0.md - Google OAuth 2.0 実装ガイド

このドキュメントでは、Cloudflare Workers (Hono) 環境における Google OAuth 2.0 認証の実装プロセス、環境設定、およびトラブルシューティングの記録を管理します。

---

## 1. 技術スタック・仕様概要
- **Framework**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Identity Provider**: Google Cloud Console (OAuth 2.0)
- **ID Strategy**: `user_id` = Google `sub` (永続的一意識別子)
    - 理由：Googleの `sub` は不変の識別子であり、メールアドレス変更時も同一ユーザーとして識別可能なため。

---

## 2. 環境変数の管理マトリックス
認証情報は動作環境（Local / Remote）によって保存場所が異なります。特にシークレットの扱いには注意が必要です。

| 項目 | 変数名 | ローカル環境 (`.dev.vars` / `wrangler.jsonc`) | リモート環境 (Cloudflare Dashboard) |
| :--- | :--- | :--- | :--- |
| **クライアントID** | `GOOGLE_CLIENT_ID` | `wrangler.jsonc` の `vars` セクションに記述 | Dashboard または `wrangler.jsonc` |
| **シークレットキー** | `GOOGLE_CLIENT_SECRET` | `.dev.vars` に記述 (Git対象外) | Dashboard の **Secrets** (暗号化) |

> **重要**: リモート環境で Secret を追加した後は、反映のために再デプロイが必要になる場合があります。

---

## 3. 実装上の重要チェックポイント

### ① パスの動的解決 (Path Resolution)
Honoのルーティング（例: `/_sandbox/test02`）下で動作させる際、相対パスによるリンク記述はURL末尾の `/` の有無で壊れるリスクがあります。

- **問題**: `href="./auth/google"` と書くと、実行URLによって `/_sandbox/auth/google` にズレる。
- **解決策**: `c.req.path` からベースパスを抽出し、`${basePath}/auth/google` のように結合してリンクを生成する。これにより、どのディレクトリ階層にデプロイしても動的に正しいURLを指すようになる。

### ② Google Cloud Console の厳格な照合
Google OAuth 2.0 では、設定された **Redirect URI** と、実行コードから送られる `redirect_uri` パラメータが **1文字でも違うと認証が拒否されます。**

- **承認済みのリダイレクト URI (設定例)**:
  - `http://localhost:5173/_sandbox/test02/auth/google/callback`
  - `https://aletheia-cafe.[subdomain].workers.dev/_sandbox/test02/auth/google/callback`
- **エラー 401: invalid_client**: クライアントIDの不一致や、環境変数の読み込み失敗時に発生する。

### ③ DB (D1) スキーマとの整合性
既存の `schema.sql` を変更せず、`user_id` に Google の `sub` を格納する設計。

- **カラム名の不一致**: スキーマが `status` (文字列) の場合、コード内で `status_id` (数値) を参照すると SQL エラーになるため、SQL 文をスキーマ定義に合わせる。
- **論理削除**: `status = 'DELETED'` への更新と、`deleted_at = CURRENT_TIMESTAMP` の記録を行う。

---

## 4. 認証処理のフロー
1. **認可リクエスト**: ユーザーを Google 認証画面へ転送。
2. **認可コード受取**: Callback URL で `code` をクエリパラメータとして取得。
3. **トークン交換**: Backend (Workers) から Google サーバーへ `code` と `Secret` を送信し、`access_token` を取得。
4. **属性取得**: トークンを用いて Google ユーザー情報 API から `sub`, `email`, `name` を取得。
5. **永続化 (UPSERT)**: 
    - `user_id` が存在しなければ新規 `INSERT`。
    - 存在すれば `status = 'ACTIVE'` に戻して `last_login_at` を `UPDATE`。
6. **セッション維持**: `user_id` を HttpOnly クッキーにセット。

---

## 5. トラブルシューティング履歴
| 現象 | 原因 | 対策 |
| :--- | :--- | :--- |
| ボタン遷移先が `/_sandbox/auth/google` になる | 相対パス `./auth/google` の解釈ズレ | `basePath` を動的に生成し結合する |
| `invalid_client` エラー | IDの未設定または反映待ち | `wrangler.jsonc` の変数確認と数分の待機 |
| リモート環境でのみ 500 エラー | Cloudflare 上の Secrets 未登録 | Dashboard の Settings > Variables から Secret を登録 |
| `no such column: status_id` | DB定義とSQLコードの不一致 | `schema.sql` を正とし、コード側のカラム名を修正 |