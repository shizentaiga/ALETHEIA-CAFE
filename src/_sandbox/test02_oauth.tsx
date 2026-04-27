import { Hono } from 'hono'

export const test02 = new Hono()

test02.get('/', (c) => {
  // c.render を使用することで、renderer.tsx の共通レイアウトを適用します
  return c.render(
    <>
      <p>test02です。（共通レンダラー適用済み）</p>
    </>
  )
})