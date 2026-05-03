import { Hono } from 'hono'

export const test03 = new Hono<{ Bindings: { ALETHEIA_CAFE_DB: D1Database } }>()

/**
 * --- API: ドリルダウン用の部分HTMLを返す ---
 */
test03.get('/api/areas', async (c) => {
  const regionId = c.req.query('region');
  const prefId = c.req.query('pref');
  const level = Number(c.req.query('level'));

  const parentId = regionId || prefId;
  const nextLevel = level + 1;

  if (!parentId) return c.html(<option value="">選択してください</option>);

  const { results } = await c.env.ALETHEIA_CAFE_DB.prepare(`
    SELECT area_id, name FROM areas 
    WHERE area_id LIKE ? || '-%' 
    AND area_level = ?
    ORDER BY area_id ASC
  `).bind(parentId, nextLevel).all();

  return c.html(
    <>
      <option value="">選択してください</option>
      {results.map((area: any) => (
        <option value={area.area_id}>{area.name}</option>
      ))}
    </>
  );
});

/**
 * --- Main Page ---
 */
test03.get('/', async (c) => {
  // 現在のベースパスを取得（/_sandbox/test03）
  // これにより、環境が変わっても自動で追従します
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;

  const [regions, stats] = await Promise.all([
    c.env.ALETHEIA_CAFE_DB.prepare(`SELECT area_id, name FROM areas WHERE area_level = 1 ORDER BY area_id ASC`).all(),
    c.env.ALETHEIA_CAFE_DB.prepare(`
      SELECT 
        substr(area_id, 1, 2) as region_code,
        (SELECT name FROM areas WHERE area_id = substr(a.area_id, 1, 2)) as region_name,
        count(*) as city_count
      FROM areas a
      WHERE area_level = 3
      GROUP BY region_code
    `).all()
  ]);

  return c.render(
    <div style="padding: 20px; font-family: sans-serif; max-width: 800px; margin: auto;">
      
      <header style="margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        {/* href を baseUrl に固定することで確実に test03 のトップへ戻します */}
        <a href={baseUrl} style="text-decoration: none; color: #333;">
          <h1 style="margin: 0; cursor: pointer; display: inline-block;">
            ALETHEIA Area Master
          </h1>
        </a>
        <p style="font-size: 0.8em; color: #999; margin-top: 5px;">Base: {baseUrl}</p>
      </header>

      <section style="background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h2 style="margin-top: 0;">🔍 エリアドリルダウン</h2>
        <div style="display: flex; gap: 10px;">
          
          {/* 
             相対パス指定を "api/areas" に変更（./を抜く）
             または `${baseUrl}api/areas` と書くと最も確実です 
          */}
          <select 
            name="region" 
            hx-get={`${baseUrl}api/areas?level=1`} 
            hx-trigger="change"
            hx-target="#select-pref"
            hx-push-url="true"
            style="padding: 10px; flex: 1; cursor: pointer;"
          >
            <option value="">大エリアを選択</option>
            {regions.results.map((r: any) => (
              <option value={r.area_id}>{r.name}</option>
            ))}
          </select>

          <select 
            id="select-pref" 
            name="pref" 
            hx-get={`${baseUrl}api/areas?level=2`} 
            hx-trigger="change"
            hx-target="#select-city"
            hx-push-url="true"
            style="padding: 10px; flex: 1; cursor: pointer;"
          >
            <option value="">都道府県を選択</option>
          </select>

          <select 
            id="select-city" 
            name="city" 
            hx-push-url="true"
            style="padding: 10px; flex: 1; cursor: pointer;"
          >
            <option value="">市区町村を選択</option>
          </select>
        </div>
      </section>

      <section>
        <h2>📊 大エリア別 登録状況</h2>
        <table style="width: 100%; border-collapse: collapse; background: #fff;">
          <thead>
            <tr style="background: #333; color: #fff;">
              <th style="padding: 12px; text-align: left;">Region ID</th>
              <th style="padding: 12px; text-align: left;">エリア名</th>
              <th style="padding: 12px; text-align: right;">市区町村数</th>
            </tr>
          </thead>
          <tbody>
            {stats.results.map((r: any) => (
              <tr key={r.region_code} style="border-bottom: 1px solid #eee;">
                <td style="padding: 12px; font-family: monospace;">{r.region_code}</td>
                <td style="padding: 12px; font-weight: bold;">{r.region_name}</td>
                <td style="padding: 12px; text-align: right; color: #007bff;">{r.city_count} 件</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer style="margin-top: 50px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
        <a href={baseUrl} style="color: #666; font-size: 0.9em;">Reset Search</a>
      </footer>
    </div>
  )
})