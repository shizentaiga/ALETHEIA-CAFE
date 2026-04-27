import { Hono } from 'hono'

export const home = new Hono()

// --- Routes ---
home.get('/', (c) => {
  return c.render(
    <>
      <p>トップページのtestです。（共通レンダラー適用済み）</p>
    </>
  )
})