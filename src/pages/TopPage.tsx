/**
 * [File Path] src/pages/TopPage.tsx
 * [Role] Main handler for the top page. It handles both HTMX partial updates and full page loads.
 */
import { Hono } from 'hono'
import { TopHeader } from './TopHeader'
import { TopMain } from './TopMain'
import { TopFooter } from './TopFooter'
import { SearchResult } from '../components/SearchResult' // Added for partial updates
import { fetchServices } from '../db/queries/main' 
import { getCookie } from 'hono/cookie'

// Define D1 type for the environment (prevents build errors)
type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const home = new Hono<{ Bindings: Bindings }>()

// --- Routes ---
home.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;
  const q = c.req.query('q') || '';
  const area = c.req.query('area'); 

  // Check user session
  const userId = getCookie(c, 'aletheia_session')
  const user = userId 
    ? await db.prepare('SELECT display_name FROM users WHERE user_id = ?').bind(userId).first()
    : null
  
  // Get service data from database
  const { results, total } = await fetchServices(db, q, 1, area);
  
  /**
   * Check if the request is from HTMX.
   * Requests from 'hx-get' include the 'HX-Request: true' header.
   */
  const isHX = c.req.header('HX-Request') === 'true'

  if (isHX) {
    // Return only the search results for partial update
    return c.html(<SearchResult results={results} total={total} area={area} />)
  }

  // For first access or page reload, return the full page layout
  return c.render(
    <>
      <TopHeader user={user} />
      <TopMain results={results} total={total} area={area} />
      <TopFooter />
    </>
  )
})