/**
 * [File Path] src/pages/TopPage.tsx
 * [Role] トップページのルートハンドラ。HTMXによる部分更新と通常アクセスを振り分けます。
 */
import { Hono } from 'hono'
import { TopHeader } from './TopHeader'
import { TopMain } from './TopMain'
import { TopFooter } from './TopFooter'
import { SearchResult } from '../components/SearchResult' // ★追加：部分返却用
import { fetchServices } from '../db/queries/main' 
import { getCookie } from 'hono/cookie'

// D1の型定義（ビルドエラー防止）
type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const home = new Hono<{ Bindings: Bindings }>()

// --- Routes ---
home.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;
  const q = c.req.query('q') || '';
  const area = c.req.query('area'); 

  // セッション確認
  const userId = getCookie(c, 'aletheia_session')
  const user = userId 
    ? await db.prepare('SELECT display_name FROM users WHERE user_id = ?').bind(userId).first()
    : null
  
  // サービスデータの取得
  const { results, total } = await fetchServices(db, q, 1, area);
  
  /**
   * ★HTMXリクエスト判定
   * area.ts からの hx-get リクエストには 'HX-Request: true' ヘッダーが含まれます。
   */
  const isHX = c.req.header('HX-Request') === 'true'

  if (isHX) {
    // エリア選択時は、検索結果リスト（#search-result-module 内）のみを返却
    return c.html(<SearchResult results={results} total={total} />)
  }

  // 初回アクセスやリロード時は、共通レイアウトを適用して全体を返却
  return c.render(
    <>
      <TopHeader user={user} />
      <TopMain results={results} total={total} />
      <TopFooter />
    </>
  )
})