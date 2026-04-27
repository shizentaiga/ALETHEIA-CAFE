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
├── index.tsx              # エントリポイント。ルーティングとサーバー設定
├── renderer.tsx           # 全ページ共通の土台（<head>, HTMX, 共通 CSS の読み込み）
├── style.css              # リセット CSS・全画面共通変数（変数のみを推奨）
│
├── pages/
│   ├── TopPage.tsx        # トップページの親。Header / Main / Footer を配置
│   ├── TopHeader.tsx      # ロゴ・透過背景ヘッダー（自己完結型）
│   ├── TopFooter.tsx      # Sticky Footer（自己完結型）
│   └── TopMain.tsx        # メイン領域。下記コンポーネントをレイアウトする
│
├── components/            # ★ TopMain の中で使う「独立国家」たち
│   ├── SearchArea.tsx     # 旧 TopMain_1：ドリルダウン（CSS / JS 内包）
│   ├── SearchCategory.tsx # 旧 TopMain_2：カテゴリ選択（CSS / JS 内包）
│   └── SearchResult.tsx   # 旧 TopMain_3：結果一覧リスト（CSS / JS 内包）
│
└── public/
    └── (画像・favicon などの静的資産)
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