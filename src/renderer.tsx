import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ALETHEIA-CAFE</title>
        
        {/* 【将来的な拡張予定】
          1. クライアント側JS (src/client.ts) の読み込み
          2. ページごとのタイトル(title変数)の動的反映
          3. メタタグの動的制御
        */}

        {/* CSSを直接指定（Viteがパスを解決します） */}
        <link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
})