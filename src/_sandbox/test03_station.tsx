import { Hono } from 'hono'
import { html } from 'hono/html'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const test03 = new Hono<{ Bindings: Bindings }>()

test03.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`

  // 1. 基本統計の取得
  const stats = await db.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM companies) as company_count,
      (SELECT COUNT(*) FROM lines) as line_count,
      (SELECT COUNT(*) FROM stations) as station_count,
      (SELECT COUNT(*) FROM stations WHERE e_status = 2) as closed_station_count
  `).first()

  // 2. 都道府県別駅数ランキング (Top 10)
  // ※pref_cdの名称マッピングは簡易化のためSQL内でCASEを使用
  const prefStats = await db.prepare(`
    SELECT 
      pref_cd,
      COUNT(*) as count 
    FROM stations 
    GROUP BY pref_cd 
    ORDER BY count DESC 
    LIMIT 10
  `).all()

  // 3. 同一駅名ランキング（乗換駅・重複確認）
  // station_g_cd が同じものは「同じ駅」として扱われるため、
  // station_name でグループ化して、異なる station_cd がいくつあるかを集計
  const duplicateStations = await db.prepare(`
    SELECT 
      station_name, 
      COUNT(*) as count,
      GROUP_CONCAT(DISTINCT address) as locations
    FROM stations 
    GROUP BY station_name 
    HAVING count > 1 
    ORDER BY count DESC 
    LIMIT 10
  `).all()

  return c.render(
    <div style="font-family: sans-serif; max-width: 900px; margin: 0 auto; padding: 20px;">
      <header>
        <a href={baseUrl} style="text-decoration: none; color: #333;">
          <h1>🚉 Railway Data Health Check</h1>
        </a>
      </header>

      <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px;">
        <div style="background: #f0f4f8; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 0.9rem; color: #666;">鉄道会社数</div>
          <div style="font-size: 1.8rem; font-weight: bold;">{stats?.company_count}</div>
        </div>
        <div style="background: #f0f4f8; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 0.9rem; color: #666;">路線総数</div>
          <div style="font-size: 1.8rem; font-weight: bold;">{stats?.line_count}</div>
        </div>
        <div style="background: #f0f4f8; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 0.9rem; color: #666;">駅総数</div>
          <div style="font-size: 1.8rem; font-weight: bold;">{stats?.station_count}</div>
        </div>
        <div style="background: #ffecec; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 0.9rem; color: #e53e3e;">うち廃止駅</div>
          <div style="font-size: 1.8rem; font-weight: bold; color: #e53e3e;">{stats?.closed_station_count}</div>
        </div>
      </section>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
        <section>
          <h3>📍 都道府県別駅数 (Top 10)</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #eee; text-align: left;">
                <th style="padding: 8px;">Code</th>
                <th style="padding: 8px;">駅数</th>
              </tr>
            </thead>
            <tbody>
              {prefStats.results.map((row: any) => (
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px;">Pref {row.pref_cd}</td>
                  <td style="padding: 8px;">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3>🔄 重複駅名ランキング</h3>
          <p style="font-size: 0.8rem; color: #666;">※別路線で同名の駅、または乗換駅の数</p>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #eee; text-align: left;">
                <th style="padding: 8px;">駅名</th>
                <th style="padding: 8px;">重複数</th>
              </tr>
            </thead>
            <tbody>
              {duplicateStations.results.map((row: any) => (
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px; font-weight: bold;">{row.station_name}</td>
                  <td style="padding: 8px;">{row.count} <span style="font-size: 0.7rem; color: #999;">Lines</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <footer style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 0.8rem;">
        Last Database Sync: 2026-05-10
      </footer>
    </div>
  )
})