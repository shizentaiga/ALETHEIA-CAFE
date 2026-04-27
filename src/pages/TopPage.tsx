import { Hono } from 'hono'

/**
 * [Page Module: TopPage]
 * サービス全体の入り口となるメインページです。
 * index.tsx で定義された共通の renderer を介して出力されます。
 */
export const toppage = new Hono()

toppage.get('/', (c) => {
  // c.render を使用することで、renderer.tsx の共通レイアウトを適用します
  return c.render(
    <>
      <p>トップページのtestです。（共通レンダラー適用済み）</p>
    </>
  )
})