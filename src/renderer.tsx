import { jsxRenderer } from 'hono/jsx-renderer'

/**
 * [Configuration]
 * Global site settings and asset paths.
 */
const SITE_CONFIG = {
  title: 'ALETHEIA',
  description: '自分に最適な場所を見つけるための検索プラットフォーム',
  lang: 'ja',
  charset: 'UTF-8',
  assets: {
    htmx: 'https://unpkg.com/htmx.org@1.9.12',
    favicon: '/icon.svg',
    searchUi: '/search-ui.js' // Client-side logic for search interaction
  }
} as const

/**
 * [Global Styles]
 * Critical CSS for initial rendering performance.
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
    padding: 0; /* Adjust padding if necessary to avoid header overlap */
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
 * [Renderer]
 * Defines the common HTML structure used across all pages.
 */
export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang={SITE_CONFIG.lang}>
      <head>
        <meta charset={SITE_CONFIG.charset} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {/* SEO and Metadata for search engine results */}
        <meta name="description" content={SITE_CONFIG.description} />

        {/* Resolve connection latency by preconnecting to the CDN domain */}
        <link rel="preconnect" href="https://unpkg.com" />

        <title>{SITE_CONFIG.title}</title>

        {/* Favicon configuration using a single SVG */}
        <link rel="icon" href={SITE_CONFIG.assets.favicon} type="image/svg+xml" />
        
        {/* 
          Load HTMX with 'defer' to prevent blocking the initial page render.
          Initializes the library for AJAX-driven interactions.
        */}
        <script src={SITE_CONFIG.assets.htmx} defer crossorigin="anonymous"></script>

        {/* Client-side synchronization logic for search chips */}
        <script src={SITE_CONFIG.assets.searchUi} defer></script>

        {/* Inline global styles for optimized First Contentful Paint (FCP) */}
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