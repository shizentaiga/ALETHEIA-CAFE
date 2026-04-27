import { Hono } from 'hono'

/**
 * [Test Module: Hello Sandbox]
 * 疎結合なコンポーネントや新機能の動作確認を、本番環境から分離して行います。
 */
export const test00 = new Hono()

test00.get('/', (c) => {
  // c.render を使用することで、renderer.tsx の共通レイアウトを適用します
  return c.render(
    <>
      <p>test00です。（共通レンダラー適用済み）</p>
    </>
  )
})