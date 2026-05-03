import { Hono } from 'hono'

export const test03 = new Hono<{ Bindings: { ALETHEIA_CAFE_DB: D1Database } }>()

test03.get('/', async (c) => {
  // 1. 各階層の件数とサンプルを同時に取得
  // L1: 大エリアごとの件数
  const regionsQuery = c.env.ALETHEIA_CAFE_DB.prepare(`
    SELECT 
      substr(area_id, 1, 2) as region_code,
      (SELECT name FROM areas WHERE area_id = substr(a.area_id, 1, 2)) as region_name,
      count(*) as city_count
    FROM areas a
    WHERE area_level = 3
    GROUP BY region_code
  `).all();

  // L2: 都道府県(および北海道の仮想エリア)ごとの件数
  const prefsQuery = c.env.ALETHEIA_CAFE_DB.prepare(`
    SELECT 
      p.name as pref_name,
      p.area_id as pref_id,
      (SELECT count(*) FROM areas WHERE area_id LIKE p.area_id || '-%' AND area_level = 3) as city_count
    FROM areas p
    WHERE area_level = 2
    ORDER BY pref_id ASC
  `).all();

  // L3: ランダムな市区町村サンプル
  const sampleCitiesQuery = c.env.ALETHEIA_CAFE_DB.prepare(`
    SELECT name, area_id, lat, lng 
    FROM areas 
    WHERE area_level = 3 
    ORDER BY RANDOM() 
    LIMIT 10
  `).all();

  // 並列実行
  const [regions, prefs, samples] = await Promise.all([
    regionsQuery,
    prefsQuery,
    sampleCitiesQuery
  ]);

  return c.render(
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>エリアマスター確認用 (Test03)</h1>

      <section style="margin-bottom: 30px;">
        <h2>📊 大エリア（L1）統計</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <thead style="background: #f4f4f4;">
            <tr><th>Region ID</th><th>名称</th><th>市区町村数</th></tr>
          </thead>
          <tbody>
            {regions.results.map((r: any) => (
              <tr key={r.region_code}>
                <td>{r.region_code}</td>
                <td>{r.region_name}</td>
                <td style="text-align: right;">{r.city_count} 件</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style="margin-bottom: 30px;">
        <h2>📍 都道府県/仮想エリア（L2）統計</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
          {prefs.results.map((p: any) => (
            <div key={p.pref_id} style="padding: 10px; border: 1px solid #ddd; border-radius: 4px;">
              <strong>{p.pref_name}</strong><br/>
              <span style="color: #666; font-size: 0.9em;">ID: {p.pref_id}</span><br/>
              <span style="font-weight: bold;">{p.city_count} cities</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>🔍 市区町村サンプル（L3 / Random 10）</h2>
        <ul>
          {samples.results.map((s: any) => (
            <li key={s.area_id}>
              <code>[{s.area_id}]</code> <strong>{s.name}</strong> 
              <span style="font-size: 0.8em; color: #888; margin-left: 10px;">
                (Lat: {s.lat}, Lng: {s.lng})
              </span>
            </li>
          ))}
        </ul>
      </section>
      
    </div>
  )
})