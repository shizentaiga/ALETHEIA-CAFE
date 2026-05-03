// src/_sandbox/test04_check.tsx

import { Hono } from 'hono'
import { normalizeAddress } from '../lib/searchUtils'

export const test04 = new Hono<{ Bindings: { ALETHEIA_CAFE_DB: D1Database } }>()

test04.get('/', async (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;

  // 1. データの取得
  // servicesからは判定の源泉となるフル住所(address)を、areasからはマスター名称を取得
  const [servicesRes, areasRes] = await Promise.all([
    c.env.ALETHEIA_CAFE_DB.prepare(`SELECT service_id, title, pref, city, address FROM services WHERE deleted_at IS NULL`).all(),
    c.env.ALETHEIA_CAFE_DB.prepare(`SELECT area_id, name FROM areas WHERE area_level = 3`).all()
  ]);

  const services = servicesRes.results || [];
  const areas = (areasRes.results || []).map((a: any) => ({
    id: a.area_id,
    name: a.name,
    normalizedName: normalizeAddress(a.name)
  }));

  // 2. 判定ロジック：全文スキャン方式
  const matchedList: any[] = [];
  const unmatchedList: any[] = [];

  services.forEach((s: any) => {
    const fullAddress = normalizeAddress(s.address || '');
    
    // addressの中に、いずれかのarea.normalizedNameが含まれているか？
    // 文字数の長い順（例：「札幌市中央区」を「札幌市」より優先）に判定するとより正確ですが、
    // area_level=3に絞っているため、基本的にはそのまま回します。
    const foundArea = areas.find(area => fullAddress.includes(area.normalizedName));

    if (foundArea) {
      matchedList.push({ 
        ...s, 
        matchedAreaName: foundArea.name, 
        areaId: foundArea.id 
      });
    } else {
      unmatchedList.push(s);
    }
  });

  const totalCount = services.length;
  const matchedCount = matchedList.length;
  const unmatchedCount = unmatchedList.length;
  const matchRate = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

  return c.render(
    <div style="padding: 20px; font-family: sans-serif; max-width: 1000px; margin: auto;">
      <header style="margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        <a href={baseUrl} style="text-decoration: none; color: #333;">
          <h1 style="margin: 0;">ALETHEIA Full-Scan Analyzer</h1>
        </a>
        <p style="font-size: 0.8em; color: #666;">住所全文スキャン方式 (services.address ⊇ areas.name)</p>
      </header>

      {/* 統計パネル */}
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

      {/* 結果テーブル */}
      <section style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        {/* 判定不能リスト */}
        <div>
          <h2 style="color: #cf1322; font-size: 1.2em;">⚠️ 判定不能 (Failed)</h2>
          <div style="max-height: 500px; overflow-y: auto; border: 1px solid #eee;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.8em;">
              <thead style="position: sticky; top: 0; background: #fafafa;">
                <tr style="border-bottom: 2px solid #eee;">
                  <th style="padding: 8px; text-align: left;">Title / Address</th>
                </tr>
              </thead>
              <tbody>
                {unmatchedList.map((s: any) => (
                  <tr key={s.service_id} style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 8px;">
                      <strong>{s.title}</strong><br/>
                      <span style="color: #999;">{s.address}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 判定成功リスト (一部表示) */}
        <div>
          <h2 style="color: #389e0d; font-size: 1.2em;">✅ 判定成功 (Matched Sample)</h2>
          <div style="max-height: 500px; overflow-y: auto; border: 1px solid #eee;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.8em;">
              <thead style="position: sticky; top: 0; background: #fafafa;">
                <tr style="border-bottom: 2px solid #eee;">
                  <th style="padding: 8px; text-align: left;">Matched Area</th>
                  <th style="padding: 8px; text-align: left;">Address</th>
                </tr>
              </thead>
              <tbody>
                {matchedList.slice(0, 100).map((s: any) => (
                  <tr key={s.service_id} style="border-bottom: 1px solid #f0f0f0;">
                    <td style="padding: 8px;"><span style="background: #f6ffed; color: #389e0d; padding: 2px 4px; border-radius: 4px;">{s.matchedAreaName}</span></td>
                    <td style="padding: 8px; color: #666;">{s.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer style="margin-top: 50px; color: #999; font-size: 0.8em; text-align: center; background: #f9f9f9; padding: 20px;">
        判定ロジック: <code>normalize(services.address).includes(normalize(areas.name))</code>
      </footer>
    </div>
  )
})