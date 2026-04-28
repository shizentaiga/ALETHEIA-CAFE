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
  
  // 3. データを取得（初期状態として空文字と1ページ目を指定）
  const { results, total } = await fetchServices(db, '', 1);

  return c.render(
    <>
      <TopHeader />
      {/* 4. 取得した本物のデータを流し込む */}
      <TopMain results={results} total={total} />
      <TopFooter />
    </>
  )
})