import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ALETHEIA-CAFE</title>
        
        {/* public/style.css を参照。
          開発・本番ともにパスが固定（/style.css）されるため、ビルドエラーの影響を受けません。
        */}
        <link href="/style.css" rel="stylesheet" />
      </head>
      <body>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
})