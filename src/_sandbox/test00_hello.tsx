import { Hono } from 'hono'

export const test00 = new Hono()

test00.get('/', (c) => {
  // 現在のベースパスを取得（/_sandbox/test00等）
  // これにより、環境が変わっても自動で追従します
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;

  // c.render を使用することで、renderer.tsx の共通レイアウトを適用します
  return c.render(
    <>
      <header><a href={baseUrl}><h1>ALETHEIA</h1></a></header>
      <p>タイトルをクリックするとトップに移動します。</p>
    </>
  )
})