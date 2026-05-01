/**
 * [File Path] src/_sandbox/test05_cdn.tsx
 */

import { Hono } from 'hono'
import { html } from 'hono/html'
import { PREFECTURE_MASTER, getPrefectureName } from '../lib/constants'

export const test05 = new Hono()

test05.get('/', (c) => {
  const cf = (c.req.raw as any).cf || {}
  const headers = Object.fromEntries(c.req.raw.headers.entries())

  // ① CDNから直接取得した値
  const rawCountry = cf.country || 'unknown'
  const rawRegionCode = cf.regionCode || 'unknown'

  // ② constants.ts のロジックを使用して変換
  // 日本(JP)の場合のみ変換処理を実行
  const isJapan = rawCountry === 'JP'
  const convertedPrefecture = isJapan ? getPrefectureName(rawRegionCode) : ''

  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CDN Parameters Trace</title>
      <style>
        body { font-family: sans-serif; line-height: 1.6; padding: 20px; background: #f0f2f5; color: #333; }
        .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        h2 { border-left: 4px solid #0051c3; padding-left: 10px; font-size: 1.2rem; margin-top: 0; }
        .trace-box { display: flex; align-items: center; gap: 15px; background: #eef6ff; padding: 15px; border-radius: 6px; border: 1px solid #b6d4fe; }
        .arrow { font-size: 1.5rem; color: #0051c3; }
        .label { font-size: 0.8rem; color: #666; display: block; }
        .value { font-weight: bold; font-size: 1.1rem; }
        .highlight { color: #d32f2f; }
        pre { background: #2d2d2d; color: #ccc; padding: 15px; border-radius: 6px; overflow: auto; font-size: 0.85rem; }
        code { font-family: monospace; }
      </style>
    </head>
    <body>
      <h1>CDN Location Resolver</h1>

      <div class="card">
        <h2>① & ② Location Detection (Logic Trace)</h2>
        <div class="trace-box">
          <div>
            <span class="label">Raw Region Code (from CDN)</span>
            <span class="value">${rawRegionCode}</span>
          </div>
          <div class="arrow">➜</div>
          <div>
            <span class="label">Converted Name (via PREFECTURE_MASTER)</span>
            <span class="value highlight">${convertedPrefecture || '変換失敗/対象外'}</span>
          </div>
        </div>
        <p style="font-size: 0.85rem; margin-top: 10px;">
          <strong>Condition:</strong> Country is <code>${rawCountry}</code> 
          ${isJapan ? html`<span style="color:green;">(Match: JP)</span>` : html`<span style="color:red;">(Not JP)</span>`}
        </p>
      </div>

      <div class="card">
        <h2>③ Reference: Full Debug Data</h2>
        <p class="label">c.req.raw.cf (Full Object)</p>
        <pre><code>${JSON.stringify(cf, null, 2)}</code></pre>
        
        <p class="label">Request Headers</p>
        <pre><code>${JSON.stringify(headers, null, 2)}</code></pre>
      </div>
    </body>
    </html>
  `)
})