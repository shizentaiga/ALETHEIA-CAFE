// iPhoneでキーワード検索の決定が効かない問題の切り分け

// src/_sandbox/test12_iphone.tsx
import { Hono } from 'hono'

export const test12 = new Hono()

test12.get('/', (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;

  return c.render(
    <>
      <header><a href={baseUrl}><h1>IPHONE TEST</h1></a></header>
      
      {/* 
        💡 ポイント:
        1. <form> で括る（action属性を持たせる）
        2. input type="search" を使う（iOSで検索用UIになる）
        3. enterkeyhint="search" を明示する（最新のiOSで「検索」ボタン化を促進）
        4. type="submit" のボタンを置く（非表示でも可）
      */}
      <form action={baseUrl} method="get" style="margin-top: 20px;">
        <input 
          type="search" 
          name="q" 
          placeholder="キーワードを入力..." 
          enterkeyhint="search"
          style="padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 8px;"
        />
        
        {/* iOSのキーボード確定を有効にするために物理的なsubmitボタンが必要 */}
        <button type="submit" style="display: none;">検索</button>
      </form>

      <div style="margin-top: 20px; color: #666;">
        現在の検索クエリ: <b>{c.req.query('q') || 'なし'}</b>
      </div>
    </>
  )
})