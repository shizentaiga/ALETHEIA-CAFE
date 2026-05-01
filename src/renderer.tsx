import { jsxRenderer } from 'hono/jsx-renderer'

/**
 * 【Configuration】
 * サイト全体の基本設定とアセットパス
 */
const SITE_CONFIG = {
  title: 'ALETHEIA',
  description: '自分に最適な場所を見つけるための検索プラットフォーム',
  lang: 'ja',
  charset: 'UTF-8',
  assets: {
    htmx: 'https://unpkg.com/htmx.org@1.9.12',
    favicon: '/icon.svg',
    searchUi: '/search-ui.js' // 追加: 外部JSのパス
  }
} as const

/**
 * 【Global Styles】
 */
const GLOBAL_STYLE = `
  :root {
    --bg-color: #ffffff;
    --text-color: #333333;
    --accent-color: #0070f3;
  }

  body { 
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: var(--text-color);
    background-color: var(--bg-color);
    line-height: 1.6;
    min-height: 100vh;
  }

  h1, h2, h3 {
    font-family: Arial, Helvetica, sans-serif;
    line-height: 1.2;
  }

  h1 { font-size: 2rem; margin-bottom: 1rem; }

  main {
    max-width: 800px;
    margin: 0 auto;
    padding: 0; /* paddingを調整（Headerと干渉しないようレイアウトに合わせて変更） */
  }

  a {
    color: var(--accent-color);
    text-decoration: none;
  }

  a:hover { text-decoration: underline; }

  button { cursor: pointer; }

  * { box-sizing: border-box; }
`

/**
 * 【Renderer】
 * ページ共通のHTML構造を定義するレンダラー
 */
export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang={SITE_CONFIG.lang}>
      <head>
        <meta charset={SITE_CONFIG.charset} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* SEO・検索結果表示用の説明文 */}
        <meta name="description" content={SITE_CONFIG.description} />

        {/* CDNドメインへの事前接続による接続遅延の解消 */}
        <link rel="preconnect" href="https://unpkg.com" />

        <title>{SITE_CONFIG.title}</title>

        {/* アイコン設定 */}
        <link rel="icon" href={SITE_CONFIG.assets.favicon} type="image/svg+xml" />
        
        {/* HTMXの読み込み */}
        <script src={SITE_CONFIG.assets.htmx} defer crossorigin="anonymous"></script>

        {/* 追加: 検索窓のチップ化・同期ロジック（外部JS） */}
        <script src={SITE_CONFIG.assets.searchUi} defer></script>

        {/* グローバルスタイルのインライン適用 */}
        <style>{GLOBAL_STYLE}</style>
      </head>
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
})