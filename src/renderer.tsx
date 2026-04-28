import { jsxRenderer } from 'hono/jsx-renderer'

// --- Configuration (定数定義) ---
const SITE_CONFIG = {
  title: 'ALETHEIA',
  lang: 'ja',
  charset: 'UTF-8',
  assets: {
    css: '/style.css',
    htmx: 'https://unpkg.com/htmx.org@1.9.12',
  }
} as const

// --- Global Styles (HTMLから移植した基本スタイル) ---
const GLOBAL_STYLE = `
  body { 
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #ffffff;
    color: #111111;
    min-height: 100vh;
  }
  * { box-sizing: border-box; }
`

// --- Renderer ---
export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang={SITE_CONFIG.lang}>
      <head>
        <meta charset={SITE_CONFIG.charset} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{SITE_CONFIG.title}</title>
        
        {/* HTMXの読み込み */}
        <script src={SITE_CONFIG.assets.htmx} crossorigin="anonymous"></script>

        {/* 基本スタイルの適用 */}
        <style>{GLOBAL_STYLE}</style>
        
        {/* 外部CSS（public/style.css） */}
        <link href={SITE_CONFIG.assets.css} rel="stylesheet" />
      </head>
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
})