import { Hono } from 'hono'

export const test09 = new Hono()

test09.get('/', (c) => {
  // c.render を使用することで、renderer.tsx の共通レイアウトを適用します
  return c.render(
    <>
      <p>test09です。（共通レンダラー適用済み）</p>
    </>
  )
})