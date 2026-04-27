import { jsxRenderer } from 'hono/jsx-renderer'

// --- Configuration (定数定義) ---
const SITE_CONFIG = {
  title: 'ALETHEIA-CAFE',
  lang: 'ja',
  charset: 'UTF-8',
  // public フォルダ内の資産パス
  assets: {
    css: '/style.css',
  }
} as const

// --- Renderer ---
export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang={SITE_CONFIG.lang}>
      <head>
        <meta charset={SITE_CONFIG.charset} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{SITE_CONFIG.title}</title>
        
        {/* 静的資産の読み込み */}
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