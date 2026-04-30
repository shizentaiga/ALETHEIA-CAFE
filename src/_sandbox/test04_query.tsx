import { Hono } from 'hono'

export const test04 = new Hono()

// sandboxApp側で /test04 にバインドされているため、ここは '/' でOK
test04.get('/', (c) => {
  const fullUrl = c.req.url
  
  // Hono標準の取得方法：URLデコードも自動で行われるため安全です
  const q = c.req.query('q') || ''
  const area = c.req.query('area') || '未選択'

  // ベースとなるパスを定義（変更に強くするため）
  const basePath = '/_sandbox/test04'

  return c.render(
    <div style="padding: 20px; font-family: sans-serif;">
      <h3>フルリロード検証（サンドボックス対応版）</h3>
      <p style="font-size: 0.9rem; color: #666;">
        現在の階層: {basePath}
      </p>
      <hr />

      <div style="background: #eef; padding: 15px; border-radius: 8px;">
        現在のエリア: <strong>{area}</strong> {q && <span>(キーワード: {q})</span>}
      </div>

      <nav style="margin-top: 20px; display: flex; gap: 10px;">
        {/* 
          /_sandbox/test04/ への絶対パスで指定することで
          どの階層からでも正確にアクセスできるようにします
        */}
        <a 
          href={`${basePath}/?area=Tokyo&q=test`} 
          style="background: #007aff; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px;"
        >
          東京 (q=test)
        </a>

        <a 
          href={`${basePath}/?area=Osaka`} 
          style="background: #007aff; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px;"
        >
          大阪
        </a>

        <a 
          href={`${basePath}/`} 
          style="background: #666; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px;"
        >
          リセット
        </a>
      </nav>

      <div style="margin-top: 30px; border-top: 1px solid #eee; pt: 10px;">
        <p style="font-size: 0.8rem; color: #888;">
          <strong>Debug Info:</strong><br />
          Full URL: {fullUrl}
        </p>
      </div>
    </div>
  )
})