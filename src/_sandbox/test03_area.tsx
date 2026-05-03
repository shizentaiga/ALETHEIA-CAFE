import { Hono } from 'hono'

export const test03 = new Hono<{ Bindings: { ALETHEIA_CAFE_DB: D1Database } }>()

/**
 * --- API: ドリルダウン用の部分HTMLを返す ---
 */
test03.get('/api/areas', async (c) => {
  const parentId = c.req.query('parent');
  const level = Number(c.req.query('level'));
  const nextLevel = level + 1;

  // デバッグ用ログ（ターミナルに表示されます）
  console.log(`[API] parentId: ${parentId}, nextLevel: ${nextLevel}`);

  if (!parentId) return c.html(<option value="">選択してください</option>);

  try {
    // 1. 次の階層のリストを取得
    // 例：parentId='10' (関東) なら '10-%' かつ level=2 を探す
    const { results } = await c.env.ALETHEIA_CAFE_DB.prepare(`
      SELECT area_id, name FROM areas 
      WHERE area_id LIKE ? || '-%' 
      AND area_level = ?
      ORDER BY area_id ASC
    `).bind(parentId, nextLevel).all();

    // 2. 「すべて」オプション用に親の名前を取得
    const parentArea = await c.env.ALETHEIA_CAFE_DB.prepare(`
      SELECT name FROM areas WHERE area_id = ?
    `).bind(parentId).first<{ name: string }>();

    return c.html(
      <>
        <option value="">選択してください</option>
        {/* 都道府県が選ばれた時（次はLevel 3）に「東京都すべて」を出す */}
        {nextLevel === 3 && parentArea && (
          <option value={parentId} style="font-weight: bold; color: #007bff;">
            {parentArea.name} すべて
          </option>
        )}
        {results.map((area: any) => (
          <option value={area.area_id} key={area.area_id}>{area.name}</option>
        ))}
      </>
    );
  } catch (e: any) {
    console.error(e.message);
    return c.html(<option>Error</option>, 500);
  }
});

/**
 * --- Main Page ---
 */
test03.get('/', async (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;

  // 初期表示（Level 1）の取得
  const { results: regions } = await c.env.ALETHEIA_CAFE_DB.prepare(
    `SELECT area_id, name FROM areas WHERE area_level = 1 ORDER BY area_id ASC`
  ).all();

  return c.render(
    <div style="padding: 20px; font-family: sans-serif; max-width: 800px; margin: auto;">
      <header style="margin-bottom: 20px; border-bottom: 2px solid #333;">
        <h1>ALETHEIA Area Master</h1>
      </header>

      <section style="background: #f4f4f4; padding: 20px; border-radius: 8px;">
        <h2 style="margin-top: 0;">🔍 エリアドリルダウン</h2>
        <div style="display: flex; gap: 10px;">
          
          {/* 1. 地方選択 */}
          <select 
            name="parent"
            hx-get={`${baseUrl}api/areas?level=1`} 
            hx-trigger="change"
            hx-target="#select-pref"
            style="padding: 10px; flex: 1;"
          >
            <option value="">大エリアを選択</option>
            {regions.map((r: any) => (
              <option value={r.area_id} key={r.area_id}>{r.name}</option>
            ))}
          </select>

          {/* 2. 都道府県選択 */}
          <select 
            id="select-pref" 
            name="parent"
            hx-get={`${baseUrl}api/areas?level=2`} 
            hx-trigger="change"
            hx-target="#select-city"
            style="padding: 10px; flex: 1;"
          >
            <option value="">都道府県を選択</option>
          </select>

          {/* 3. 市区町村選択 */}
          <select 
            id="select-city" 
            name="area_id" 
            style="padding: 10px; flex: 1;"
          >
            <option value="">市区町村を選択</option>
          </select>
        </div>
      </section>

      <footer style="margin-top: 40px; text-align: center;">
        <a href={baseUrl} style="color: #666;">リセット</a>
      </footer>
    </div>
  )
})