import { Hono } from 'hono'

export const test01 = new Hono()
test01.get('/', (c) => {
  // c.render を使用することで、renderer.tsx の共通レイアウトを適用します
  return c.render(
    <>
      <p>test01です。（共通レンダラー適用済み）</p>
    </>
  )
})