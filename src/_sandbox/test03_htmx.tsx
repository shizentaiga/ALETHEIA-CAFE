import { Hono } from 'hono'

export const test03 = new Hono()

test03.get('/', (c) => {
  const currentPath = c.req.path
  const q1 = c.req.query('q1') || ''
  const q2 = c.req.query('q2') || ''
  const q3 = c.req.query('q3') || ''
  const isHX = c.req.header('HX-Request') === 'true'

  // 部分返却用のコンポーネント（表示と「状態の保持」を兼ねる）
  const resultDisplay = (
    <div id="combined-result" style="border: 1px solid #333; padding: 15px; background: #fafafa;">
      <h4>サーバー側の受信状況</h4>
      <ul style="line-height: 1.8;">
        <li><strong>q1 (Keywords):</strong> <span style="color: blue;">{q1 || '未入力'}</span></li>
        <li><strong>q2 (Area):</strong> <span style="color: red;">{q2 || '未選択'}</span></li>
        <li><strong>q3 (Category):</strong> <span style="color: green;">{q3 || '未選択'}</span></li>
      </ul>
      <p style="font-size: 0.75rem; color: #888;">URL: {currentPath}?q1={q1}&q2={q2}&q3={q3}</p>
      
      {/* 💡 隠しフィールドに「今のサーバーの状態」を書き戻す。これが次のリクエストの source になる */}
      <input type="hidden" id="q2-state" name="q2" value={q2} />
      <input type="hidden" id="q3-state" name="q3" value={q3} />
    </div>
  )

  if (isHX) return c.html(resultDisplay)

  return c.render(
    <div style="padding: 25px; max-width: 600px; font-family: sans-serif;">
      <h3>3軸パラメータ合流テスト (q1/q2/q3)</h3>
      
      <div style="display: flex; flex-direction: column; gap: 25px;">
        
        {/* パラメータ1: 自由入力 (キーワード) */}
        <div>
          <label style="font-weight: bold; font-size: 0.8rem;">[q1] キーワード：</label><br />
          <input 
            type="text" 
            name="q1" 
            id="q1-input" 
            value={q1}
            placeholder="入力すると自動送信"
            hx-get={currentPath}
            hx-trigger="keyup changed delay:300ms"
            hx-target="#combined-result"
            hx-include="#q2-state, #q3-state" // 💡 q2, q3 を道連れにする
            hx-push-url="true"
            style="width: 100%; padding: 8px; margin-top: 5px;"
          />
        </div>

        {/* パラメータ2: ボタン選択 (エリア) */}
        <div>
          <label style="font-weight: bold; font-size: 0.8rem;">[q2] エリア：</label><br />
          <div style="display: flex; gap: 8px; margin-top: 5px;">
            {['新宿', '渋谷'].map(val => (
              <button 
                type="button"
                hx-get={`${currentPath}?q2=${val}`}
                hx-target="#combined-result"
                hx-include="#q1-input, #q3-state" // 💡 q1, q3 を道連れにする
                hx-push-url="true"
                style="padding: 6px 12px; cursor: pointer;"
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* パラメータ3: ボタン選択 (カテゴリ) */}
        <div>
          <label style="font-weight: bold; font-size: 0.8rem;">[q3] カテゴリ：</label><br />
          <div style="display: flex; gap: 8px; margin-top: 5px;">
            {['カフェ', 'バー'].map(val => (
              <button 
                type="button"
                hx-get={`${currentPath}?q3=${val}`}
                hx-target="#combined-result"
                hx-include="#q1-input, #q2-state" // 💡 q1, q2 を道連れにする
                hx-push-url="true"
                style="padding: 6px 12px; cursor: pointer;"
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* 表示・状態保持コンテナ */}
        {resultDisplay}

      </div>
    </div>
  )
})