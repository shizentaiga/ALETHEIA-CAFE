# ALETHEIA-CAFE

疎結合な予約管理システムのプロトタイプ。ALETHEIA-PROTO の課題（密結合）を解消し、機能追加・変更に強い構造を目指す。

---

## Tech Stack

| カテゴリ | 技術 |
|:---|:---|
| Framework | Hono（Vite 版） |
| Runtime | Cloudflare Workers / Pages |
| Language | TypeScript |
| Database | Cloudflare D1（実装予定） |

---

## Architecture Design

`index.tsx` を「ハブ」として機能させ、各ページや機能のロジックを完全に分離する疎結合設計を採用。

| レイヤー | ファイル | 責務 |
|:---|:---|:---|
| Global Router | `src/index.tsx` | ルーティングと共通ミドルウェアの定義のみ |
| Renderer | `src/renderer.tsx` | 全ページ共通の HTML 構造（CSS 読み込み等）を管理する「額縁」 |
| Pages | `src/pages/` | ページ単位のロジックをカプセル化 |
| Sandbox | `src/_sandbox/` | 本番環境を汚さずに新機能・コンポーネントを試作する実験場 |

---

## Directory Structure

~~~
src/
├── index.tsx              # エントリポイント。ルーティングとAPIエンドポイントの定義
├── renderer.tsx           # 全ページ共通の土台（HTML外枠）
├── style.css              # リセット CSS・全画面共通変数
│
├── pages/                 # 【View】画面単位の構成要素
│   ├── TopPage.tsx        # トップページの親レイアウト（データ取得の蛇口）
│   ├── TopHeader.tsx      # ヘッダー（ロゴ・検索窓・ログインリンク）
│   ├── TopFooter.tsx      # フッター
│   └── TopMain.tsx        # メイン領域のレイアウト（配置担当）
│
├── components/            # 【UI Parts】機能単位のコンポーネント
│   ├── SearchArea.tsx     # ドリルダウン検索（初期表示用）
│   ├── SearchCategory.tsx # カテゴリ選択
│   ├── SearchResult.tsx   # 結果一覧リスト（HTMX更新ターゲット）
│   └── AreaList.tsx       # ドリルダウン用リスト（HTMXで部分更新される小部品）
│
├── api/                   # 【Logic】HTMXから呼び出される動的エンドポイント
│   └── area.ts            # ドリルダウン用の階層データを返すロジック
│
├── db/                    # 【Data】データベース関連
│   ├── queries/           # ★物理分割されたクエリ層
│   │   ├── main.ts        # 外部（API）への統合窓口
│   │   ├── search.ts      # D1からの検索実行
│   │   ├── transformers.ts # UI用ラベルへの整形
│   │   └── utils.ts       # SQL補助・共通判定
│   ├── schema.sql         # テーブル定義
│   └── seed/              # 初期データ投入スクリプト
│       ├── areas/
│       └── chains/
│
├── lib/                   # 【Shared】共通定数・外部連携
│   ├── constants.ts       # 地理情報・UIラベル・マスターデータ
│   └── auth.ts            # 認証ユーティリティ
│
└── public/                # 静的資産
~~~

---

## Design Principles

### 1. Atomic Component Separation

各パーツ（Header / Main / Footer）を独立したファイルとして定義し、`TopPage.tsx` で統合することで、メンテナンス性と可読性を高める。

### 2. Sticky Footer Architecture

コンテンツ量に関わらず、フッターが常に画面最下部に位置するよう、Flexbox を用いたレイアウト設計を `renderer.tsx` レベルで実装。

### 3. Future Scalability

現在は単一階層だが、今後 `mypage` や `shop` などの新機能が追加される際は、`pages/` 配下にサブディレクトリを作成し、同様の構成（Header / Main / Footer）を展開する設計思想。

---

## Development & Ops

| コマンド | 用途 |
|:---|:---|
| `npm run dev` | ローカル開発サーバーの起動 |
| `npm run deploy` | Cloudflare 本番環境（Pages）へのデプロイ |
| `npx wrangler tail` | 本番環境のリアルタイムログ監視 |

---

## Notes

- `components/` 配下の各コンポーネントは CSS / JS を内包した自己完結型として設計されています。
- `_sandbox/` での検証を経てから `components/` へ昇格させる運用を推奨します。

---

*© 2026 Taiga Shizen. ALETHEIA-CAFE is part of the shizentaiga-2026 project.*

---

## ワンポイントアドバイス

`components/` の「独立国家」設計は拡張性が高く、方向性は正しい。一点だけ、**`SearchResult.tsx` は早い段階で HTMX の `hx-target` / `hx-swap` の差し替え範囲を明確に決めておくことを推奨**。

結果リストが肥大化した際に「どこまでサーバー側で描画し、どこから JS で操作するか」の境界が曖昧になりやすく、後から変更すると `TopMain.tsx` の構造ごと触ることになる。`<div id="search-results">` のような差し替えターゲットを早期に固定しておくと、HTMX・Vanilla JS・Hono の責務分離（SoC）が保ちやすくなる。