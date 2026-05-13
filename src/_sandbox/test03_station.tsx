// src/_sandbox/test03_station.tsx

import { Hono } from 'hono'
import { fetchCoordinatesFromYahoo } from '../lib/geo'
import { calculateNearestStations, StationCandidate } from '../db/queries/main'
import { isValidCoordinates, formatAccessTime } from '../lib/geoUtils'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
  YAHOO_MAPS_CLIENT_ID: string
}

export const test03 = new Hono<{ Bindings: Bindings }>()

test03.get('/', async (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;
  const db = c.env.ALETHEIA_CAFE_DB
  const clientId = c.env.YAHOO_MAPS_CLIENT_ID
  
  const addressQuery = c.req.query('address')
  let geoResult: any = null
  let nearestStations: StationCandidate[] = []
  let errorMessage: string | null = null

  if (addressQuery) {
    const geo = await fetchCoordinatesFromYahoo(addressQuery, clientId);
    
    // 1. バリデーション関数の流用
    if (geo && isValidCoordinates(geo.lat, geo.lng)) {
      geoResult = { 
        address: geo.formattedAddress, 
        lon: geo.lng, 
        lat: geo.lat 
      };

      nearestStations = await calculateNearestStations(db, geo.lat, geo.lng, 5);
    } else if (geo) {
      errorMessage = "日本の範囲外の住所が指定されました。";
    } else {
      errorMessage = "該当する住所が見つかりませんでした。";
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
          <h1 style="margin: 0;">📍 最寄駅検索 (Yahoo! API)</h1>
        </a>
      </header>

      {/* 検索フォーム */}
      <section style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        <form method="get" action={baseUrl} style="display: flex; gap: 10px;">
          <input 
            type="text" 
            name="address" 
            placeholder="住所を入力" 
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
              <div style="margin-bottom: 20px; padding: 15px; border-left: 5px solid #ff0033; background: #fff5f5;">
                <strong>判定地点:</strong> {geoResult.address}<br/>
                <small style="color: #666;">座標: {geoResult.lat}, {geoResult.lon}</small>
              </div>

              <h3>🚉 付近の駅</h3>
              <div style="display: grid; gap: 10px;">
                {nearestStations.map((st) => {
                  // 2. formatAccessTime 関数の流用
                  // 直線距離から最適な「テキスト」や「距離表記」を取得
                  const access = formatAccessTime(st.distance);

                  return (
                    <div key={st.stationName} style="padding: 15px; border: 1px solid #eee; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <strong style="font-size: 1.1rem; color: #000;">{st.stationName}</strong>
                        <div style="font-size: 0.85rem; color: #666; margin-top: 4px;">
                          {st.lines.join(' / ')}
                        </div>
                      </div>
                      <div style="text-align: right;">
                        <div style="font-size: 1.1rem; font-weight: bold; color: {access.mode === 'walk' ? '#d32f2f' : '#2c3e50'};">
                          {access.text}
                        </div>
                        <div style="font-size: 0.75rem; color: #999;">
                          （道のり約 {access.distanceText}）
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p style="color: #e53e3e;">{errorMessage}</p>
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