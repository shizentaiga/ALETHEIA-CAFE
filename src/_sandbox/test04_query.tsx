import { Hono } from 'hono'

export const test04 = new Hono()

test04.get('/', (c) => {
  // 1. 現在のフルURLを取得
  const fullUrl = c.req.url
  
  // 2. URLデコード（%E6... を日本語に戻す）
  const decodedUrl = decodeURIComponent(fullUrl)
  
  // 3. 正規表現で area パラメータの値を抽出
  // [?&]     : ? か & のどちらかから始まり
  // area=    : area= という文字列が続き
  // ([^&]+)  : & 以外の文字が1つ以上続く部分をキャプチャ
  const areaMatch = decodedUrl.match(/[?&]area=([^&]+)/)
  const extractedArea = areaMatch ? areaMatch[1] : '（未検出）'

  return c.render(
    <div style="padding: 20px; line-height: 1.6;">
      <h3>URL解析サンドボックス</h3>
      <hr />
      
      <section>
        <strong>1. 生のURL:</strong>
        <pre style="background: #f4f4f4; padding: 10px;">{fullUrl}</pre>
      </section>

      <section>
        <strong>2. デコード後のURL:</strong>
        <pre style="background: #f4f4f4; padding: 10px;">{decodedUrl}</pre>
      </section>

      <section>
        <strong>3. 抽出されたエリア:</strong>
        <p style="font-size: 1.2rem; color: #007aff; font-weight: bold;">
          {extractedArea}
        </p>
      </section>

      <hr />
      <p style="font-size: 0.8rem; color: #666;">
        ヒント: URLの末尾に <code>?area=北海道&q=1</code> などを付けてリロードしてみてください。
      </p>
    </div>
  )
})