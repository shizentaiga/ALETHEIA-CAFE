import { Hono } from 'hono'
import { getDirection } from '../lib/geoUtils'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const test13 = new Hono<{ Bindings: Bindings }>()

test13.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : (c.req.path + '/');

  // 1. DBから小岩駅の情報を取得
  // ※論理的にJR小岩駅（line_cdが11313など）に絞ることも可能ですが、まずは名前で取得します
  const koiwaStation = await db.prepare(`
    SELECT station_name, lat, lon as lng 
    FROM stations 
    WHERE station_name = '小岩' 
    LIMIT 1
  `).first<{ station_name: string, lat: number, lng: number }>();

  if (!koiwaStation) {
    return c.html("小岩駅がデータベースに見つかりませんでした。");
  }

  const BASE_LAT = koiwaStation.lat;
  const BASE_LNG = koiwaStation.lng;

  // 2. 江戸川区の店舗を取得（小岩付近に限定するため ORDER BY で距離を絞ることも可能ですが、まずは35件）
  const { results: shops } = await db.prepare(`
    SELECT title, address, lat, lng 
    FROM services 
    WHERE address LIKE '%小岩%' 
      AND lat IS NOT NULL 
    LIMIT 35
  `).all();

  const results = (shops as any[]).map(shop => {
    // 基準: 駅, 対象: 店舗
    const direction = getDirection(BASE_LAT, BASE_LNG, shop.lat, shop.lng);
    const dy = shop.lat - BASE_LAT;
    const dx = shop.lng - BASE_LNG;
    
    return { ...shop, direction, dy, dx };
  });

  return c.render(
    <div style="padding: 20px; font-family: sans-serif;">
      <header style="display: flex; justify-content: space-between; align-items: center;">
        <h1>方位判定デバッグ：{koiwaStation.station_name}駅基準</h1>
        <div style="text-align: right; font-size: 0.8rem; background: #eee; padding: 10px; border-radius: 4px;">
          <strong>基準点データ (DB)</strong><br/>
          緯度: {BASE_LAT}<br/>
          経度: {BASE_LNG}
        </div>
      </header>
      
      <p style="color: #666;">※赤色はプラス（北・東）、青色はマイナス（南・西）を示します。</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background: #333; color: #fff;">
            <th style="padding: 12px; text-align: left;">店舗名 / 住所</th>
            <th style="padding: 12px; text-align: center;">dy (緯度差)</th>
            <th style="padding: 12px; text-align: center;">dx (経度差)</th>
            <th style="padding: 12px; text-align: center;">判定</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i} style="border-bottom: 1px solid #ddd;">
              <td style="padding: 12px;">
                <div style="font-weight: bold;">{r.title}</div>
                <div style="font-size: 0.75rem; color: #666;">{r.address}</div>
              </td>
              <td style="padding: 12px; text-align: center; font-family: monospace; color: {r.dy >= 0 ? '#d32f2f' : '#1976d2'}">
                {r.dy > 0 ? '+' : ''}{r.dy.toFixed(5)}
              </td>
              <td style="padding: 12px; text-align: center; font-family: monospace; color: {r.dx >= 0 ? '#d32f2f' : '#1976d2'}">
                {r.dx > 0 ? '+' : ''}{r.dx.toFixed(5)}
              </td>
              <td style="padding: 12px; text-align: center; background: #fffde7; border-left: 2px solid #fbc02d;">
                <span style="font-size: 1.8rem;">{r.direction.arrow}</span><br/>
                <strong style="font-size: 0.9rem;">{r.direction.label}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
})