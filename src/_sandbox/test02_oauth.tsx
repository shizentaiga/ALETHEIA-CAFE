import { Hono } from 'hono'
import { html } from 'hono/html'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import type { D1Database } from '@cloudflare/workers-types'

// ==========================================================
// 1. プログラム定数・設定値 (Config)
// ==========================================================
const AUTH_CONFIG = {
  GOOGLE_AUTH_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth',
  GOOGLE_TOKEN_ENDPOINT: 'https://oauth2.googleapis.com/token',
  GOOGLE_USERINFO_ENDPOINT: 'https://www.googleapis.com/oauth2/v3/userinfo',
  CALLBACK_PATH: '/auth/google/callback',
  SESSION_COOKIE: 'aletheia_test_session',
  SCOPES: 'openid email profile',
  PROMPT: 'select_account',
} as const

// ==========================================================
// 2. デザイン資産 (Assets)
// ==========================================================
const STYLES = {
  CONTAINER: 'font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;',
  CARD: 'border: 1px solid #ddd; padding: 25px; border-radius: 10px; margin-bottom: 20px; text-align: center;',
  MONITOR: 'background: #282c34; color: #61dafb; padding: 15px; border-radius: 8px; font-size: 0.8rem; text-align: left; font-family: monospace; overflow-x: auto;',
  BTN_PRIMARY: 'display: inline-block; padding: 12px 24px; background: #4285F4; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;',
  BTN_LOGOUT: 'display: inline-block; padding: 10px 20px; border: 1px solid #666; color: #666; text-decoration: none; border-radius: 5px; font-size: 0.9rem;',
  BTN_DANGER: 'display: inline-block; padding: 10px 20px; border: 1px solid #d90429; color: #d90429; text-decoration: none; border-radius: 5px; font-size: 0.9rem; background: transparent; cursor: pointer;'
}

// ==========================================================
// 3. メインロジック (Routes)
// ==========================================================
type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  ALETHEIA_CAFE_DB: D1Database 
}

export const test02 = new Hono<{ Bindings: Bindings }>()

/**
 * A. トップ画面
 * 修正ポイント：href の指定を末尾スラッシュ考慮の形式に変更
 */
test02.get('/', async (c) => {
  const sessionUserId = getCookie(c, AUTH_CONFIG.SESSION_COOKIE)
  const db = c.env.ALETHEIA_CAFE_DB

  const { results: dbUsers } = await db.prepare(
    'SELECT user_id, email, display_name, status, role, last_login_at FROM users ORDER BY created_at DESC LIMIT 5'
  ).all()

  const currentUser = sessionUserId 
    ? await db.prepare('SELECT * FROM users WHERE user_id = ?').bind(sessionUserId).first<{display_name: string, email: string}>()
    : null

  // 現在のパスを取得（例: /_sandbox/test02）
  const basePath = c.req.path.replace(/\/$/, '')

  return c.render(
    <div style={STYLES.CONTAINER}>
      <h2 style="text-align: center;">ALETHEIA Google Auth Test (test02)</h2>
      <div style={STYLES.CARD}>
        {currentUser ? (
          <>
            <p style="color: #2b9348; font-weight: bold;">✅ ログイン中: {currentUser.display_name}</p>
            <p style="font-size: 0.8rem; color: #666; margin-bottom: 20px;">Email: {currentUser.email}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
              {/* 絶対パスに近い相対指定に修正 */}
              <a href={`${basePath}/logout`} style={STYLES.BTN_LOGOUT}>ログアウト</a>
              <button 
                style={STYLES.BTN_DANGER} 
                onclick={`if(confirm('本当に退会しますか？')){ location.href='${basePath}/delete-account'; }`}
              >
                退会
              </button>
            </div>
          </>
        ) : (
          <>
            <p style="color: #666;">現在は【未ログイン】です</p>
            {/* 🌟 修正箇所: 相対パスのズレを防ぐため basePath を付与 */}
            <a href={`${basePath}/auth/google`} style={STYLES.BTN_PRIMARY}>Googleでサインイン</a>
          </>
        )}
      </div>

      <div style={STYLES.MONITOR}>
        <h3 style="color: #fff; border-bottom: 1px solid #444; margin: 0 0 10px 0;">🔍 DB Monitor (users)</h3>
        <pre style="margin: 0;">{JSON.stringify({
          session_id: sessionUserId || 'none',
          users_in_db: dbUsers
        }, null, 2)}</pre>
      </div>
    </div>
  )
})

/**
 * B. 認証開始 (Googleへ転送)
 */
test02.get('/auth/google', (c) => {
  const origin = new URL(c.req.url).origin
  const redirectUri = `${origin}${c.req.path}/callback`
  
  const queryParams = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: AUTH_CONFIG.SCOPES,
    prompt: AUTH_CONFIG.PROMPT,
  })
  return c.redirect(`${AUTH_CONFIG.GOOGLE_AUTH_ENDPOINT}?${queryParams.toString()}`)
})

/**
 * C. コールバック受取
 */
test02.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  const origin = new URL(c.req.url).origin
  const redirectUri = `${origin}${c.req.path}`
  const returnPath = c.req.path.replace(AUTH_CONFIG.CALLBACK_PATH, '')
  
  const db = c.env.ALETHEIA_CAFE_DB

  if (!code) return c.text('Authorization code missing', 400)

  try {
    const tokenRes = await fetch(AUTH_CONFIG.GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: c.env.GOOGLE_CLIENT_ID,
        client_secret: c.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json() as any
    if (!tokenRes.ok) throw new Error(`Token Exchange Failed: ${JSON.stringify(tokenData)}`)

    const userRes = await fetch(AUTH_CONFIG.GOOGLE_USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const googleUser = await userRes.json() as any

    const sub = googleUser.sub
    const email = googleUser.email
    const name = googleUser.name || email

    let user = await db.prepare('SELECT user_id FROM users WHERE user_id = ?').bind(sub).first<{user_id: string}>()

    if (!user) {
      await db.prepare(
        'INSERT INTO users (user_id, email, display_name, role, status, plan_id, last_login_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).bind(sub, email, name, 'USER', 'ACTIVE', 'free').run()
      user = { user_id: sub }
    } else {
      await db.prepare('UPDATE users SET status = ?, deleted_at = NULL, last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?')
        .bind('ACTIVE', sub).run()
    }

    setCookie(c, AUTH_CONFIG.SESSION_COOKIE, user.user_id, {
      path: '/', httpOnly: true, secure: true, maxAge: 3600, sameSite: 'Lax'
    })

    return c.redirect(returnPath)
  } catch (e) {
    return c.text('Auth Error: ' + String(e), 500)
  }
})

/**
 * D. ログアウト
 */
test02.get('/logout', (c) => {
  const returnPath = c.req.path.replace(/\/logout$/, '')
  deleteCookie(c, AUTH_CONFIG.SESSION_COOKIE, { path: '/' })
  return c.redirect(returnPath || '/')
})

/**
 * E. 退会
 */
test02.get('/delete-account', async (c) => {
  const sessionUserId = getCookie(c, AUTH_CONFIG.SESSION_COOKIE)
  const db = c.env.ALETHEIA_CAFE_DB
  const returnPath = c.req.path.replace(/\/delete-account$/, '')

  if (sessionUserId) {
    await db.prepare('UPDATE users SET status = ?, deleted_at = CURRENT_TIMESTAMP WHERE user_id = ?')
      .bind('DELETED', sessionUserId).run()
    deleteCookie(c, AUTH_CONFIG.SESSION_COOKIE, { path: '/' })
  }
  return c.redirect(returnPath || '/')
})