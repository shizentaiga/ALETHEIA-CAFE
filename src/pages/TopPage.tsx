import { Hono } from 'hono'
import { TopHeader } from './TopHeader'
import { TopMain } from './TopMain'
import { TopFooter } from './TopFooter'
import { fetchServices } from '../db/queries' // 1. クエリ関数をインポート

// D1の型定義（ビルドエラー防止）
type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const home = new Hono<{ Bindings: Bindings }>()

// --- Routes ---
// 2. async を追加して非同期化
home.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;

  // 【追加】URLの ?q=... を取得
  const q = c.req.query('q') || '';
  
// 【修正】第2引数に空文字ではなく q を渡す
  const { results, total } = await fetchServices(db, q, 1);
  
  return c.render(
    <>
      <TopHeader />
      <TopMain results={results} total={total} />
      <TopFooter />
    </>
  )
})