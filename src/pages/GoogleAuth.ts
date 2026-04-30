/**
 * [File Path] src/api/GoogleAuth.ts
 * [Role] Handles Google OAuth2 authentication flow and session management.
 */
import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { googleAuth } from '../lib/auth'

type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  ALETHEIA_CAFE_DB: D1Database
  SESSION_MAX_AGE: string
}

export const googleAuthApp = new Hono<{ Bindings: Bindings }>()

// --- Routes ---

/**
 * Step A: Login Start
 * Redirect the user to Google's OAuth consent screen.
 */
googleAuthApp.get('/auth/google', (c) => {
  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`
  return c.redirect(googleAuth.getAuthUrl(c.env.GOOGLE_CLIENT_ID, redirectUri))
})

/**
 * Step B: Callback
 * Exchange the auth code for user data and establish a session.
 */
googleAuthApp.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`
  
  if (!code) return c.redirect('/')

  try {
    // 1. Exchange code for user profile data
    const gUser = await googleAuth.exchangeCodeForUser(
      code, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, redirectUri
    )

    // 2. Persist user data in D1 (Upsert: insert new or update existing)
    await c.env.ALETHEIA_CAFE_DB.prepare(`
      INSERT INTO users (user_id, email, display_name) 
      VALUES (?, ?, ?) 
      ON CONFLICT(user_id) DO UPDATE SET 
        last_login_at = CURRENT_TIMESTAMP,
        status = 'ACTIVE'
    `).bind(gUser.sub, gUser.email, gUser.name || gUser.email).run()

    // 3. Set session cookie using Google 'sub' ID
    // Read duration from wrangler.jsonc (fallback to 7 days if undefined)
    const maxAge = Number(c.env.SESSION_MAX_AGE) || 60 * 60 * 24 * 7;

    setCookie(c, 'aletheia_session', gUser.sub, {
      path: '/',
      httpOnly: true,
      secure: true,
      maxAge: maxAge,
      sameSite: 'Lax'
    })

    return c.redirect('/')
  } catch (e) {
    console.error('Auth Error:', e)
    return c.redirect('/?error=auth_failed')
  }
})

/**
 * Step C: Logout
 * Terminate session and clear cookie.
 */
googleAuthApp.get('/logout', (c) => {
  deleteCookie(c, 'aletheia_session', { path: '/' })
  return c.redirect('/')
})