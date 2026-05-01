# ALETHEIA-CAFE

疎結合な予約管理システムのプロトタイプ。ALETHEIA-PROTO の課題（密結合）を解消し、機能追加・変更に強い構造を目指す。

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

---

## Directory Structure

~~~
src/
├── index.tsx              # エントリポイント。ルーティング定義
├── renderer.tsx           # 全ページ共通の土台（HTML外枠）
├── style.css              # リセット CSS・共通変数
│
├── pages/                 # 【View & Page Controllers】
│   ├── TopPage.tsx        # トップページの親レイアウト
│   ├── TopMain.tsx        # メイン領域のレイアウト
│   ├── TopFooter.tsx      # フッター
│   ├── TopHeader.tsx      # ヘッダー（部品の統合窓口）
│   ├── header/            # ヘッダー専用コンポーネント
│   │   ├── styles.ts      # ヘッダー固有のCSS（外部変数）
│   │   ├── HeaderSearch.tsx # 検索窓・チップ表示ロジック
│   │   └── HeaderAuth.tsx # 認証・ログイン状態表示
│   └── GoogleAuth.ts      # 認証ハンドラ
│
├── components/            # 【UI Parts】機能単位の共通コンポーネント
│   ├── SearchArea.tsx     # ドリルダウン検索（初期表示）
│   ├── SearchCategory.tsx # カテゴリ選択
│   ├── SearchResult.tsx   # 結果一覧（HTMX ターゲット）
│   └── AreaList.tsx       # 階層データ表示（HTMX 小部品）
│
├── api/                   # 【Logic】HTMX 用エンドポイント
│   └── area.ts            # ドリルダウン階層データ返却
│
├── db/                    # 【Data】D1 関連
│   ├── queries/           # 物理分割されたクエリ層
│   │   ├── main.ts        # 統合窓口
│   │   └── search.ts      # D1 検索実行
│   ├── schema.sql         # テーブル定義
│   └── seed/              # 初期データ
│
└── lib/                   # 【Shared】共通定数・ロジック
    ├── constants.ts       # 地理情報・UIテキスト
    ├── auth.ts            # 認証の低レイヤー処理
    └── search.ts          # クエリ正規化・URL同期
~~~

~~~
public/
├── icon.svg               # 共通アイコン
└── search-ui.js           # 検索窓のチップ化・削除・HTMX同期ロジック（Client-side）
~~~

---

## Design Principles

### 1. Atomic Component Separation
各パーツ（Header / Main / Footer）を独立させ、さらに Header 等の複雑なパーツはサブディレクトリ（`header/`）でスタイルとロジックを分離。

### 2. Zero-JS Focus (with HTMX & Vanilla)
HTMX を活用しつつ、パフォーマンスと SEO を重視。`search-ui.js` はあくまで UI 補助とし、サーバーサイド主導の設計を維持。

### 3. High Performance & Scalability
Cloudflare D1 や Workers の特性を活かし、低コストかつ PageSpeed Insights で高得点を維持できる軽量なアーキテクチャ。

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

---

*© 2026 Taiga Shizen. ALETHEIA-CAFE is part of the shizentaiga-2026 project.*