import { Hono } from 'hono'
import { html } from 'hono/html'

export const test05 = new Hono()

test05.get('/', (c) => {
  /**
   * The 'cf' object contains all metadata provided by Cloudflare.
   * To see all available parameters, we'll stringify the entire object.
   */
  const cf = c.req.raw.cf || {}
  const headers = Object.fromEntries(c.req.raw.headers.entries())

  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CDN Parameters Dump</title>
      <style>
        body { font-family: monospace; line-height: 1.5; padding: 20px; background: #f4f4f4; }
        h2 { border-bottom: 2px solid #ccc; }
        pre { background: #fff; padding: 15px; border: 1px solid #ddd; overflow: auto; border-radius: 4px; }
        .info { color: #d32f2f; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>Cloudflare Context (c.req.raw.cf)</h2>
      <p class="info">※ Local development might show limited data unless running with --remote.</p>
      <pre>${JSON.stringify(cf, null, 2)}</pre>

      <h2>Request Headers</h2>
      <pre>${JSON.stringify(headers, null, 2)}</pre>
    </body>
    </html>
  `)
})