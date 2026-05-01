/**
 * [File Path] src/pages/TopPage.tsx
 * [Role] Main entry point for the top page.
 */
import { Hono } from 'hono'
import { TopHeader } from './TopHeader'
import { TopMain } from './TopMain'
import { TopFooter } from './TopFooter'
import { fetchServices } from '../db/queries/main' 
import { getCookie } from 'hono/cookie'
import { resolveDetectionArea } from '../lib/geo' // 切り出した関数をインポート

// Cloudflare D1 environment bindings
type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const home = new Hono<{ Bindings: Bindings }>()

// --- Routes ---
home.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;
  const q = c.req.query('q') || '';

  // 位置情報
  // const area = c.req.query('area');   // 初期値は全国
  const area = resolveDetectionArea(c);  // 初期値はCDNの都道府県

  // Retrieve user session
  const userId = getCookie(c, 'aletheia_session')
  const user = userId 
    ? await db.prepare('SELECT display_name FROM users WHERE user_id = ?').bind(userId).first()
    : null
  
  // Fetch service list from database
  const { results, total } = await fetchServices(db, q, 1, area);
  
  // Render full page layout
  return c.render(
    <>
      <TopHeader user={user} />
      <TopMain results={results} total={total} area={area} />
      <TopFooter />
    </>
  )
})