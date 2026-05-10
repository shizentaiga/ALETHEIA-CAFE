import { Hono } from 'hono'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
  GOOGLE_MAPS_API_KEY: string // .dev.vars から読み込み
}

export const test03 = new Hono<{ Bindings: Bindings }>()

// 距離計算用の定数
const M_PER_LAT = 111111; // 緯度1度あたりのメートル
const M_PER_LON = 91000;  // 経度1度あたりのメートル（日本付近）

test03.get('/', async (c) => {
  // 現在のパスを取得（末尾の / を考慮）
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;

  const db = c.env.ALETHEIA_CAFE_DB
  const apiKey = c.env.GOOGLE_MAPS_API_KEY
  
  const addressQuery = c.req.query('address')
  let geoResult: any = null
  let nearestStations: any[] = []

  if (addressQuery) {
    try {
      // 1. Google Maps Geocoding API で座標取得
      const googleRes = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${apiKey}`
      )
      const data: any = await googleRes.json()
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0]
        const lat = result.geometry.location.lat
        const lon = result.geometry.location.lng
        geoResult = { address: result.formatted_address, lon, lat }

        // 2. 三平方の定理で近似距離が近い順に取得
        const { results } = await db.prepare(`
          SELECT 
            s.station_name, 
            l.line_name,
            s.address,
            s.lon,
            s.lat,
            ((s.lon - ?1) * (s.lon - ?1) + (s.lat - ?2) * (s.lat - ?2)) as dist_sq
          FROM stations s
          JOIN lines l ON s.line_cd = l.line_cd
          WHERE s.e_status = 0
          ORDER BY dist_sq ASC
          LIMIT 5
        `).bind(lon, lat).all()
        
        nearestStations = results
      }
    } catch (e) {
      console.error('Search error:', e)
    }
  }

  const stats = await db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM stations WHERE e_status = 0) as active_stations,
      (SELECT COUNT(*) FROM lines) as line_count
  `).first()

  return c.render(
    <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333;">
      <header style="margin-bottom: 30px; border-bottom: 2px solid #333;">
        <a href={baseUrl} style="text-decoration: none; color: #333; display: block;">
          <h1 style="margin: 0;">📍 最寄駅検索 (Google Map API)</h1>
        </a>
      </header>

      {/* 検索フォーム */}
      <section style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        <form method="get" action={baseUrl} style="display: flex; gap: 10px;">
          <input 
            type="text" 
            name="address" 
            placeholder="住所を入力（例：東京都新宿区）" 
            defaultValue={addressQuery}
            style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 5px;"
          />
          <button type="submit" style="padding: 10px 25px; background: #333; color: #fff; border: none; border-radius: 5px; cursor: pointer;">
            検索
          </button>
        </form>
      </section>

      {/* 検索結果 */}
      {addressQuery && (
        <section style="margin-bottom: 40px;">
          {geoResult ? (
            <>
              <div style="margin-bottom: 20px; padding: 15px; border-left: 5px solid #4CAF50; background: #e8f5e9;">
                <strong>判定地点:</strong> {geoResult.address}<br/>
                <small style="color: #666;">座標: {geoResult.lat}, {geoResult.lon}</small>
              </div>

              <h3>🚉 付近の駅</h3>
              <div style="display: grid; gap: 10px;">
                {nearestStations.map((st: any) => {
                  const dx = (st.lon - geoResult.lon) * M_PER_LON;
                  const dy = (st.lat - geoResult.lat) * M_PER_LAT;
                  const distanceM = Math.round(Math.sqrt(dx * dx + dy * dy));
                  const walkMinutes = Math.ceil(distanceM / 80);

                  return (
                    <div key={`${st.line_name}-${st.station_name}`} style="padding: 15px; border: 1px solid #eee; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <strong style="font-size: 1.1rem;">{st.station_name}</strong>
                        <div style="font-size: 0.85rem; color: #666;">{st.line_name} | {st.address}</div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 1.1rem; font-weight: bold; color: #2c3e50;">
                          徒歩約 {walkMinutes} 分
                        </div>
                        <div style="font-size: 0.75rem; color: #999;">
                          （直線 {distanceM} m）
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p style="color: #e53e3e;">該当する住所が見つかりませんでした。</p>
          )}
        </section>
      )}

      {/* 最小限の統計 */}
      <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.85rem; color: #888; display: flex; justify-content: space-between;">
        <div>
          運用中駅数: <strong>{stats?.active_stations}</strong> / 
          収録路線数: <strong>{stats?.line_count}</strong>
        </div>
      </footer>
    </div>
  )
})