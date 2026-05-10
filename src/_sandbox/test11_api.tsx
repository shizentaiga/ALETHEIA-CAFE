import { Hono } from 'hono'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
  GOOGLE_MAPS_API_KEY: string
}

export const test11 = new Hono<{ Bindings: Bindings }>()

// 距離計算（1分=80m換算）
const calcWalk = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dx = (lon1 - lon2) * 91000;
  const dy = (lat1 - lat2) * 111111;
  const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
  return { dist, min: Math.ceil(dist / 80) };
};

test11.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB
  const apiKey = c.env.GOOGLE_MAPS_API_KEY
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`
  const addressQuery = c.req.query('address')

  let results: any[] = []

  if (addressQuery) {
    // A. 国土地理院 API
    const gsiRes = await fetch(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(addressQuery)}`).then(r => r.json()) as any[]
    if (gsiRes.length > 0) {
      const { coordinates } = gsiRes[0].geometry
      results.push({ name: '国土地理院', lat: coordinates[1], lon: coordinates[0], addr: gsiRes[0].properties.title })
    }

    // B. Google Maps API
    const googleRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressQuery)}&key=${apiKey}`).then(r => r.json()) as any
    if (googleRes.status === 'OK') {
      const { lat, lng } = googleRes.results[0].geometry.location
      results.push({ name: 'Google API', lat: lat, lon: lng, addr: googleRes.results[0].formatted_address })
    }

    // 各ソースごとに最寄駅を判定
    for (const res of results) {
      res.station = await db.prepare(`
        SELECT s.station_name, l.line_name, s.lat, s.lon,
        ((s.lon - ?1)*(s.lon - ?1) + (s.lat - ?2)*(s.lat - ?2)) as dist_sq
        FROM stations s JOIN lines l ON s.line_cd = l.line_cd
        WHERE s.e_status = 0 ORDER BY dist_sq ASC LIMIT 1
      `).bind(res.lon, res.lat).first()
      res.walk = calcWalk(res.lat, res.lon, res.station.lat, res.station.lon)
    }
  }

  return c.render(
    <div style="font-family: sans-serif; padding: 20px; max-width: 900px; margin: 0 auto;">
      <header><a href={baseUrl} style="text-decoration:none; color:#333;"><h1>📍 Geo-Logic Sandbox</h1></a></header>
      
      <form method="get" action={baseUrl} style="display: flex; gap: 8px; margin: 20px 0;">
        <input type="text" name="address" placeholder="岩手県の住所を入力..." defaultValue={addressQuery} style="flex:1; padding:10px;" />
        <button type="submit" style="padding:10px 20px; cursor:pointer;">比較実行</button>
      </form>

      {addressQuery && (
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          {results.map(r => (
            <div style="border: 2px solid #eee; padding: 15px; border-radius: 8px;">
              <h2 style="margin-top:0; border-bottom:2px solid #ddd;">{r.name}</h2>
              <p style="font-size:0.8rem; background:#f4f4f4; padding:5px;">取得住所: {r.addr}</p>
              <p>座標: <code>{r.lat.toFixed(5)}, {r.lon.toFixed(5)}</code></p>
              <hr/>
              <div style="background:#eefaff; padding:10px;">
                <strong>判定された最寄駅:</strong><br/>
                <span style="font-size:1.2rem; font-weight:bold;">{r.station.station_name}</span><br/>
                <small>{r.station.line_name}</small>
                <div style="margin-top:10px; color:#d32f2f; font-weight:bold;">
                  徒歩 約 {r.walk.min} 分 ({r.walk.dist}m)
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})