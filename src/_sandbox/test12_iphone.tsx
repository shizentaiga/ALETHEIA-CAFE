// iPhoneでキーワード検索の決定が効かない問題の切り分け

// src/_sandbox/test12_iphone.tsx
// src/_sandbox/test12_iphone.tsx
import { Hono } from 'hono'

export const test12 = new Hono()

test12.get('/', (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;
  // 検証用：複数の 'q' パラメータを配列として取得
  const allQueries = c.req.queries('q') || [];

  return c.render(
    <>
      <header><a href={baseUrl}><h1>IPHONE TEST (Multi-Q)</h1></a></header>
      
      <form 
        action={baseUrl} 
        method="get" 
        style="margin-top: 20px;"
        onsubmit="this.querySelectorAll('.js-q').forEach(el => el.name = 'q')"
      >
        {/* 既存キーワード（チップ相当）のダミー */}
        <input type="hidden" name="q-hidden" value="apple" class="js-q" />
        <input type="hidden" name="q-hidden" value="orange" class="js-q" />

        <div style="background: #eee; padding: 10px; border-radius: 8px;">
          <span style="background: #ddd; padding: 2px 5px; margin-right: 5px;">apple ×</span>
          <span style="background: #ddd; padding: 2px 5px; margin-right: 5px;">orange ×</span>
          
          <input 
            type="search" 
            name="q" 
            placeholder="追加キーワード..." 
            enterkeyhint="search"
            style="border: none; background: transparent; font-size: 16px; outline: none;"
          />
        </div>
        
        <button type="submit" style="margin-top: 10px;">検索実行</button>
      </form>

      <div style="margin-top: 20px;">
        <p>受信したクエリ（配列）:</p>
        <pre style="background: #f0f0f0; padding: 10px;">
          {JSON.stringify(allQueries, null, 2)}
        </pre>
      </div>
    </>
  )
})