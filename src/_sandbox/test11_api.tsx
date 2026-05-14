import { Hono } from 'hono'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
  GOOGLE_MAPS_API_KEY: string
  YAHOO_MAPS_CLIENT_ID: string
}

export const test11 = new Hono<{ Bindings: Bindings }>()

// 共通の距離計算
const calcWalk = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dx = (lon1 - lon2) * 91000;
  const dy = (lat1 - lat2) * 111111;
  const dist = Math.round(Math.sqrt(dx * dx + dy * dy));
  return { dist, min: Math.ceil(dist / 80) };
};

// --- レンダリング用コンポーネント ---
const ResultCard = ({ name, data, error }: { name: string, data?: any, error?: string }) => (
  <div style="border: 2px solid #eee; padding: 15px; border-radius: 8px; background: #fff;">
    <h2 style="margin-top:0; border-bottom:2px solid #ddd; padding-bottom:10px;">{name}</h2>
    {error ? (
      <div style="color: #e53e3e; padding: 10px; background: #fff5f5; border-radius: 4px;">⚠️ {error}</div>
    ) : data ? (
      <>
        <p style="font-size:0.8rem; background:#f4f4f4; padding:8px; border-radius:4px; min-height:40px;">取得情報: {data.addr}</p>
        <p>座標: <code>{data.lat.toFixed(5)}, {data.lon.toFixed(5)}</code></p>
        <hr style="border:0; border-top:1px solid #eee; margin:15px 0;"/>
        <div style="background:#eefaff; padding:15px; border-radius:6px;">
          <strong style="color:#555;">判定された最寄駅:</strong><br/>
          <div style="margin:5px 0;">
            <span style="font-size:1.2rem; font-weight:bold; color:#000;">{data.station.station_name}</span><br/>
            <small style="color:#666;">{data.station.line_name}</small>
          </div>
          <div style="margin-top:10px; color:#d32f2f; font-weight:bold; font-size:1.1rem;">徒歩 約 {data.walk.min} 分</div>
          <div style="font-size:0.8rem; color:#888;">（直線距離: {data.walk.dist}m）</div>
        </div>
      </>
    ) : (
      <div style="text-align:center; padding: 20px; color: #999;">
        <div class="spinner" style="margin-bottom:10px;">⌛ 取得中...</div>
      </div>
    )}
  </div>
);

// --- メイン画面 ---
test11.get('/', async (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`
  const address = c.req.query('address')

  return c.render(
    <div style="font-family: sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto;">
      <script src="https://unpkg.com/htmx.org@1.9.10"></script>
      <header><a href={baseUrl} style="text-decoration:none; color:#333;"><h1>📍 Geo-Logic Sandbox (HTMX v2)</h1></a></header>
      
      <form method="get" action={baseUrl} style="display: flex; gap: 8px; margin: 20px 0;">
        <input type="text" name="address" placeholder="駅名（例：小岩）または住所を入力..." value={address || ''} style="flex:1; padding:10px;" />
        <button type="submit" style="padding:10px 20px; cursor:pointer; background:#333; color:#fff; border:none; border-radius:4px;">比較実行</button>
      </form>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
        <div id="res-gsi" hx-get={address ? `${baseUrl}api/gsi?address=${encodeURIComponent(address)}` : null} hx-trigger="load" hx-swap="outerHTML">
          <ResultCard name="国土地理院" />
        </div>
        <div id="res-google" hx-get={address ? `${baseUrl}api/google?address=${encodeURIComponent(address)}` : null} hx-trigger="load" hx-swap="outerHTML">
          <ResultCard name="Google API" />
        </div>
        <div id="res-yahoo" hx-get={address ? `${baseUrl}api/yahoo?address=${encodeURIComponent(address)}` : null} hx-trigger="load" hx-swap="outerHTML">
          <ResultCard name="Yahoo! API" />
        </div>
        <div id="res-heartrails" hx-get={address ? `${baseUrl}api/heartrails?address=${encodeURIComponent(address)}` : null} hx-trigger="load" hx-swap="outerHTML">
          <ResultCard name="HeartRails Express" />
        </div>
      </div>
    </div>
  )
})

// --- 個別APIエンドポイント ---
test11.get('/api/:provider', async (c) => {
  const provider = c.req.param('provider') ?? 'unknown'
  const address = c.req.query('address')
  const db = c.env.ALETHEIA_CAFE_DB
  
  const nameMap: Record<string, string> = {
    gsi: "国土地理院",
    google: "Google API",
    yahoo: "Yahoo! API",
    heartrails: "HeartRails Express"
  };
  const nameLabel = nameMap[provider] ?? provider;

  if (!address) return c.html(<ResultCard name={nameLabel} error="未入力です" />)

  const fetchWithTimeout = async (url: string, options = {}) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) { throw e; }
  };

  try {
    // 修正ポイント：ここで nameLabel を宣言しない（外側の nameLabel を使う）
    let lat: number, lon: number, addr: string;

    if (provider === 'gsi') {
      const res = await fetchWithTimeout(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`).then(r => r.json()) as any[]
      if (res.length === 0) throw new Error("結果なし")
      lon = res[0].geometry.coordinates[0]; lat = res[0].geometry.coordinates[1]; addr = res[0].properties.title;
    } 
    else if (provider === 'google') {
      const res = await fetchWithTimeout(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${c.env.GOOGLE_MAPS_API_KEY}`).then(r => r.json()) as any
      if (res.status !== 'OK') throw new Error(res.status)
      lat = res.results[0].geometry.location.lat; lon = res.results[0].geometry.location.lng; addr = res.results[0].formatted_address;
    } 
    else if (provider === 'yahoo') {
      const res = await fetchWithTimeout(`https://map.yahooapis.jp/geocode/V1/geoCoder?appid=${c.env.YAHOO_MAPS_CLIENT_ID}&query=${encodeURIComponent(address)}&output=json`).then(r => r.json()) as any
      if (!res.Feature) throw new Error("結果なし")
      const coords = res.Feature[0].Geometry.Coordinates.split(',');
      lon = parseFloat(coords[0]); lat = parseFloat(coords[1]); addr = res.Feature[0].Property.Address;
    }
    else if (provider === 'heartrails') {
      const res = await fetchWithTimeout(`http://express.heartrails.com/api/json?method=getStations&name=${encodeURIComponent(address)}`).then(r => r.json()) as any
      if (!res.response.station || res.response.station.length === 0) throw new Error("駅名が特定できませんでした")
      const st = res.response.station[0];
      lat = parseFloat(st.y); lon = parseFloat(st.x); addr = `${st.postal} ${st.prefecture}${st.line} ${st.name}駅`;
    } else {
      throw new Error("プロバイダー不明")
    }

    const station: any = await db.prepare(`
      SELECT s.station_name, l.line_name, s.lat, s.lon,
      ((s.lon - ?1)*(s.lon - ?1) + (s.lat - ?2)*(s.lat - ?2)) as dist_sq
      FROM stations s JOIN lines l ON s.line_cd = l.line_cd
      WHERE s.e_status = 0 ORDER BY dist_sq ASC LIMIT 1
    `).bind(lon, lat).first()
    
    if (!station) throw new Error("DB内に最寄駅が見つかりません")
    
    const walk = calcWalk(lat, lon, station.lat, station.lon)
    return c.html(<ResultCard name={nameLabel} data={{ lat, lon, addr, station, walk }} />)

  } catch (e: any) {
    const msg = e.name === 'AbortError' ? "Timeout" : e.message || "取得失敗";
    return c.html(<ResultCard name={nameLabel} error={msg} />)
  }
})