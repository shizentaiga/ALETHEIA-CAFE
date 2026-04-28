import { Hono } from 'hono'
import { TopHeader } from './TopHeader'
import { TopMain } from './TopMain'
import { TopFooter } from './TopFooter'
import { fetchServices } from '../db/queries/main' // 1. クエリ関数をインポート
import { getCookie } from 'hono/cookie' // 追加

// D1の型定義（ビルドエラー防止）
type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const home = new Hono<{ Bindings: Bindings }>()

// --- Routes ---
// 2. async を追加して非同期化
home.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;  // DBアクセス
  const q = c.req.query('q') || ''; // 検索キーワード(例：カフェ)
  const area = c.req.query('area'); // 検索エリア(例：東京都)

  // 【追加】セッション確認
  const userId = getCookie(c, 'aletheia_session')
  const user = userId 
    ? await db.prepare('SELECT display_name FROM users WHERE user_id = ?').bind(userId).first()
    : null
  
  // 引数の順番：(db, q, page, area)
  const { results, total } = await fetchServices(db, q, 1, area);
  
  return c.render(
    <>
      <TopHeader user={user} /> {/* userを渡す */}
      <TopMain results={results} total={total} />
      <TopFooter />
    </>
  )
})