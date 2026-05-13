import { Hono } from 'hono'
import { html } from 'hono/html'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const test05 = new Hono<{ Bindings: Bindings }>()

// DBからエリア情報を特定する関数
async function resolveLocationFromDB(db: D1Database, regionCode: string) {
  // 1. 中エリア(L2)を特定 (例: JISコード '13' を含む 'XX-13' を探す)
  // area_level = 2 かつ IDの末尾がそのJISコードであるものを検索
  const l2Area = await db.prepare(
    "SELECT area_id, name FROM areas WHERE area_level = 2 AND area_id LIKE ?"
  ).bind(`%-${regionCode}`).first<{ area_id: string; name: string }>();

  if (!l2Area) return null;

  // 2. IDから大エリア(L1)のIDを切り出す (例: '10-13' -> '10')
  const l1Id = l2Area.area_id.split('-')[0];

  // 3. 大エリア(L1)の名称を取得
  const l1Area = await db.prepare(
    "SELECT name FROM areas WHERE area_id = ? AND area_level = 1"
  ).bind(l1Id).first<{ name: string }>();

  return {
    l1Id: l1Id,
    l1Name: l1Area?.name || '不明',
    l2Id: l2Area.area_id,
    l2Name: l2Area.name
  };
}

test05.get('/', async (c) => {
  const cf = (c.req.raw as any).cf || {}
  const rawCountry = cf.country || 'JP'
  const rawRegionCode = cf.regionCode || '13'

  // 非同期でDBから取得
  const isJapan = rawCountry === 'JP'
  const areaData = isJapan ? await resolveLocationFromDB(c.env.ALETHEIA_CAFE_DB, rawRegionCode) : null

  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>CDN Area Resolver (DB Driven)</title>
      <style>
        body { font-family: sans-serif; line-height: 1.6; padding: 20px; background: #f0f2f5; color: #333; }
        .card { background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .resolver-box { display: flex; flex-direction: column; gap: 10px; background: #eef6ff; padding: 15px; border-radius: 6px; border: 1px solid #b6d4fe; }
        .step { display: flex; align-items: center; gap: 10px; }
        .badge { background: #0051c3; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; }
        .db-code { font-family: monospace; color: #d32f2f; font-weight: bold; background: #fff1f1; padding: 2px 5px; }
        pre { background: #2d2d2d; color: #ccc; padding: 15px; border-radius: 6px; overflow: auto; font-size: 0.85rem; }
      </style>
    </head>
    <body>
      <h1>CDN Area Resolver <small>(DB Driven)</small></h1>

      <div class="card">
        <h2>Detected Area (from D1 Database)</h2>
        ${areaData ? html`
          <div class="resolver-box">
            <div class="step">
              <span class="badge">L1: 大エリア</span>
              <span>${areaData.l1Name}</span>
              <span class="db-code">area_id: "${areaData.l1Id}"</span>
            </div>
            <div style="margin-left: 20px; color: #666;">↓</div>
            <div class="step">
              <span class="badge">L2: 中エリア</span>
              <span>${areaData.l2Name}</span>
              <span class="db-code">area_id: "${areaData.l2Id}"</span>
            </div>
          </div>
        ` : html`<p>エリアを特定できませんでした（JIS: ${rawRegionCode}）</p>`}
      </div>

      <div class="card">
        <h2>Logic Strategy</h2>
        <ol style="font-size: 0.9rem;">
          <li>CDNから都道府県コード(JIS) <code>${rawRegionCode}</code> を取得</li>
          <li>DBから <code>LIKE '%-${rawRegionCode}'</code> で中エリアを検索 ➔ <strong>${areaData?.l2Id || 'N/A'}</strong></li>
          <li>IDを分割して大エリアIDを抽出 ➔ <strong>${areaData?.l1Id || 'N/A'}</strong></li>
          <li>大エリアIDでDBを再照会して名称を取得 ➔ <strong>${areaData?.l1Name || 'N/A'}</strong></li>
        </ol>
      </div>

      <div class="card">
        <h2>Debug: Cloudflare Context</h2>
        <pre><code>${JSON.stringify(cf, null, 2)}</code></pre>
      </div>
    </body>
    </html>
  `)
})