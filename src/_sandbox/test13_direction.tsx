// src/_sandbox/test13_direction.tsx

import { Hono } from 'hono'
import { getDirection } from '../lib/geoUtils'

export const test13 = new Hono()

// 代表的なテストデータ（小岩駅を基準: 35.733, 139.888）
const TEST_CASES = [
  { name: '北 (市川方面)', lat: 35.743, lng: 139.888 },
  { name: '東 (江戸川方面)', lat: 35.733, lng: 139.898 },
  { name: '南 (鹿骨方面)', lat: 35.723, lng: 139.888 },
  { name: '西 (新小岩方面)', lat: 35.733, lng: 139.878 },
  { name: '北東', lat: 35.743, lng: 139.898 },
]

test13.get('/', (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : (c.req.path + '/');
  
  // 基準点（デフォルト: 小岩駅）
  const baseLat = 35.733258;
  const baseLng = 139.888122;

  return c.render(
    <div style="padding: 20px; font-family: monospace;">
      <header>
        <a href={baseUrl} style="text-decoration: none; color: inherit;">
          <h1>方位判定サンドボックス (Test 13)</h1>
        </a>
      </header>

      <section style="margin-bottom: 30px; border: 1px solid #ccc; padding: 15px;">
        <h3>1. プリセットテスト (基準: 小岩駅)</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #333;">
              <th style="text-align: left;">ケース名</th>
              <th style="text-align: left;">対象緯度/経度</th>
              <th style="text-align: center;">結果</th>
            </tr>
          </thead>
          <tbody>
            {TEST_CASES.map(tc => {
              const res = getDirection(baseLat, baseLng, tc.lat, tc.lng);
              return (
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px;">{tc.name}</td>
                  <td>{tc.lat}, {tc.lng}</td>
                  <td style="text-align: center; font-size: 1.5rem;">
                    <strong>{res.arrow}</strong> ({res.label})
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section style="border: 1px solid #ccc; padding: 15px;">
        <h3>2. 手入力テスト</h3>
        <form hx-get={baseUrl + "calc"} hx-target="#result" hx-trigger="change, keyup from:input delay:200ms">
          <div style="display: grid; gap: 10px;">
            <div>
              <label>基準緯度 (lat1): </label>
              <input type="number" name="lat1" value={baseLat.toString()} step="0.000001" />
            </div>
            <div>
              <label>基準経度 (lng1): </label>
              <input type="number" name="lng1" value={baseLng.toString()} step="0.000001" />
            </div>
            <hr />
            <div>
              <label>対象緯度 (lat2): </label>
              <input type="number" name="lat2" value={(baseLat + 0.005).toString()} step="0.000001" />
            </div>
            <div>
              <label>対象経度 (lng2): </label>
              <input type="number" name="lng2" value={baseLng.toString()} step="0.000001" />
            </div>
          </div>
        </form>
        <div id="result" style="margin-top: 20px; padding: 20px; background: #f0f0f0; text-align: center;">
          <p>数値を変更するとここに結果が出ます</p>
        </div>
      </section>
    </div>
  )
})

// HTMX用エンドポイント
test13.get('/calc', (c) => {
  const q = c.req.query();
  const lat1 = parseFloat(q.lat1);
  const lng1 = parseFloat(q.lng1);
  const lat2 = parseFloat(q.lat2);
  const lng2 = parseFloat(q.lng2);

  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
    return c.html("入力値が不正です");
  }

  const res = getDirection(lat1, lng1, lat2, lng2);
  const dy = lat2 - lat1;
  const dx = lng2 - lng1;

  return c.html(
    <div style="font-size: 1.2rem;">
      <div style="font-size: 3rem; margin-bottom: 10px;">{res.arrow}</div>
      <div>判定: <strong>{res.label}</strong></div>
      <div style="font-size: 0.8rem; color: #666; margin-top: 10px;">
        差分: dy={dy.toFixed(6)}, dx={dx.toFixed(6)}
      </div>
    </div>
  )
})