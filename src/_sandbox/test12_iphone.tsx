// src/_sandbox/test12_iphone.tsx

// iPhoneでキーワード検索の決定が効かない問題の切り分け

import { Hono } from 'hono'

export const test12 = new Hono()

test12.get('/', (c) => {
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