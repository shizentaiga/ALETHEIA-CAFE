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
import { resolveDetectionArea } from '../lib/geo'
import { getNormalizedKeywords, joinKeywords } from '../lib/search'

// Cloudflare D1 environment bindings
type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const home = new Hono<{ Bindings: Bindings }>()

// --- Routes ---
home.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;

  // 1. Get and normalize query (Remove duplicates)
  const rawQ = c.req.query('q') || '';
  const q = joinKeywords(getNormalizedKeywords(c.req.queries('q')));

  // 3. Identify target area
  const area = resolveDetectionArea(c);

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
      <TopHeader user={user} results={results} total={total} area={area} q={q} />
      <TopMain results={results} total={total} area={area} q={q}/>
      <TopFooter />
    </>
  )
})