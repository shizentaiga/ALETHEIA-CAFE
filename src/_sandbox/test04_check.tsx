// src/_sandbox/test04_check.tsx

import { Hono } from 'hono'
import { normalizeAddress } from '../lib/searchUtils'

export const test04 = new Hono<{ Bindings: { ALETHEIA_CAFE_DB: D1Database } }>()

test04.get('/', async (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;

  // 1. データの並列取得
  const [servicesRes, areasRes] = await Promise.all([
    c.env.ALETHEIA_CAFE_DB.prepare(`SELECT service_id, title, pref, city, address FROM services WHERE deleted_at IS NULL`).all(),
    c.env.ALETHEIA_CAFE_DB.prepare(`SELECT area_id, name, area_level FROM areas WHERE area_level = 3`).all()
  ]);

  const services = servicesRes.results || [];
  const areas = areasRes.results || [];

  // 2. 比較用の正規化済みエリアMapを作成
  // キー: 正規化した名前, 値: area_id
  const areaMap = new Map<string, string>();
  areas.forEach((a: any) => {
    areaMap.set(normalizeAddress(a.name), a.area_id);
  });

  // 3. 判定ロジックの実行
  const matchedList: any[] = [];
  const unmatchedList: any[] = [];

  services.forEach((s: any) => {
    const combined = normalizeAddress((s.pref || '') + (s.city || ''));
    const cityOnly = normalizeAddress(s.city || '');
    
    // パターンA: 「都道府県+市区町村」で一致
    // パターンB: 「市区町村」のみで一致
    const areaId = areaMap.get(combined) || areaMap.get(cityOnly);

    if (areaId) {
      matchedList.push({ ...s, areaId });
    } else {
      unmatchedList.push(s);
    }
  });

  const totalCount = services.length;
  const matchedCount = matchedList.length;
  const unmatchedCount = unmatchedList.length;
  const matchRate = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

  return c.render(
    <div style="padding: 20px; font-family: sans-serif; max-width: 900px; margin: auto;">
      <header style="margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        <a href={baseUrl} style="text-decoration: none; color: #333;">
          <h1 style="margin: 0;">ALETHEIA Migration Analyzer v2</h1>
        </a>
        <p style="font-size: 0.8em; color: #666;">正規化ライブラリ適用済み判定テスト</p>
      </header>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
        <div style="background: #e6f7ff; padding: 20px; border-radius: 8px; border: 1px solid #91d5ff; text-align: center;">
          <div style="font-size: 0.9em; color: #0050b3;">判定可能</div>
          <div style="font-size: 2em; font-weight: bold; color: #0050b3;">{matchedCount}</div>
        </div>
        <div style="background: #fff1f0; padding: 20px; border-radius: 8px; border: 1px solid #ffa39e; text-align: center;">
          <div style="font-size: 0.9em; color: #cf1322;">判定不能</div>
          <div style="font-size: 2em; font-weight: bold; color: #cf1322;">{unmatchedCount}</div>
        </div>
        <div style="background: #f6ffed; padding: 20px; border-radius: 8px; border: 1px solid #b7eb8f; text-align: center;">
          <div style="font-size: 0.9em; color: #389e0d;">適合率</div>
          <div style="font-size: 2em; font-weight: bold; color: #389e0d;">{matchRate}%</div>
        </div>
      </div>

      <section>
        <h2 style="color: #cf1322; border-left: 4px solid #cf1322; padding-left: 10px;">⚠️ 判定不能サンプル (TOP 50)</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.85em;">
          <thead>
            <tr style="background: #fafafa; border-bottom: 2px solid #eee;">
              <th style="padding: 10px; text-align: left;">Title</th>
              <th style="padding: 10px; text-align: left;">Raw Data (Pref/City)</th>
              <th style="padding: 10px; text-align: left;">Normalized</th>
              <th style="padding: 10px; text-align: left;">Address</th>
            </tr>
          </thead>
          <tbody>
            {unmatchedList.slice(0, 50).map((s: any) => (
              <tr key={s.service_id} style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px; font-weight: bold;">{s.title}</td>
                <td style="padding: 10px;">{s.pref}{s.city}</td>
                <td style="padding: 10px; color: #cf1322;">{normalizeAddress((s.pref || '') + (s.city || ''))}</td>
                <td style="padding: 10px; color: #888;">{s.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer style="margin-top: 50px; color: #999; font-size: 0.8em; text-align: center;">
        判定ロジック: <code>normalize(pref+city)</code> を <code>Map</code> で高速照合
      </footer>
    </div>
  )
})