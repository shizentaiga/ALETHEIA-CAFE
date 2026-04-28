import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { googleAuth } from '../lib/auth'

// D1と環境変数の型定義
type Bindings = {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  ALETHEIA_CAFE_DB: D1Database
}

export const googleAuthApp = new Hono<{ Bindings: Bindings }>()

// A. ログイン開始：ユーザーをGoogleへ飛ばす
googleAuthApp.get('/auth/google', (c) => {
  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`
  return c.redirect(googleAuth.getAuthUrl(c.env.GOOGLE_CLIENT_ID, redirectUri))
})

// B. コールバック：Googleから戻ってきた時の処理
googleAuthApp.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  const redirectUri = `${new URL(c.req.url).origin}/auth/google/callback`
  
  if (!code) return c.redirect('/')

  try {
    // 1. コードをユーザー情報に交換
    const gUser = await googleAuth.exchangeCodeForUser(
      code, c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, redirectUri
    )

    // 2. DBへ保存（UPSERT：いれば更新、いなければ挿入）
    await c.env.ALETHEIA_CAFE_DB.prepare(`
      INSERT INTO users (user_id, email, display_name) 
      VALUES (?, ?, ?) 
      ON CONFLICT(user_id) DO UPDATE SET 
        last_login_at = CURRENT_TIMESTAMP,
        status = 'ACTIVE'
    `).bind(gUser.sub, gUser.email, gUser.name || gUser.email).run()

    // 3. クッキーにセッションID（Googleのsub）を保存
    setCookie(c, 'aletheia_session', gUser.sub, {
      path: '/',
      httpOnly: true,
      secure: true,
      maxAge: 3600, // 1時間
      sameSite: 'Lax'
    })

    return c.redirect('/')
  } catch (e) {
    console.error('Auth Error:', e)
    return c.redirect('/?error=auth_failed')
  }
})

// C. ログアウト処理
googleAuthApp.get('/logout', (c) => {
  deleteCookie(c, 'aletheia_session', { path: '/' })
  return c.redirect('/')
})