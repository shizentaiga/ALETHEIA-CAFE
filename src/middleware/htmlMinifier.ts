// src/middleware/htmlMinifier.ts

import { MiddlewareHandler } from 'hono'

/**
 * 配信されるHTMLからコメントや不要な空白を削除するミドルウェア
 */
export const htmlMinifier = (): MiddlewareHandler => {
  return async (c, next) => {
    await next()

    // Content-Type が HTML の場合のみ処理を実行
    if (c.res.headers.get('Content-Type')?.includes('text/html')) {
      const html = await c.res.text()
      
      const minifiedHtml = html
        .replace(/<!--[\s\S]*?-->/g, '')     // 1. HTMLコメント
        .replace(/\/\*[\s\S]*?\*\//g, '')   // 2. CSS/JS ブロックコメント
        .replace(/\n\s*\/\/.*$/gm, '')      // 3. JS 1行コメント (行頭・改行後の // を削除)
        .replace(/^\s+|\s+$/gm, '')         // 4. 行頭・行末の空白削除
        .replace(/\n/g, '')                 // 5. 改行の削除
        .replace(/\s{2,}/g, ' ')            // 6. 連続する空白を1つに集約

      c.res = new Response(minifiedHtml, c.res)
    }
  }
}