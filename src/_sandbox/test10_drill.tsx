import { Hono } from 'hono'
import { html, raw } from 'hono/html'

export const test10 = new Hono()

test10.get('/', (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;
  const selectedArea = c.req.query('area_name') || 'エリアを選択';

  return c.render(
    <>
      <header>
        <a href={baseUrl} style="text-decoration: none; color: inherit;">
          <h1>ALETHEIA</h1>
        </a>
      </header>
      
      <p>現在の検索状態: <strong>{selectedArea}</strong></p>

      <div id="area-drilldown-root" style="border: 1px solid #ccc; padding: 10px; width: 250px;">
        <button 
          hx-get={`${baseUrl}list`} 
          hx-target="#area-drilldown-root"
          hx-swap="innerHTML"
          style="width: 100%; padding: 10px; text-align: left; cursor: pointer;"
        >
          {selectedArea} ❯
        </button>
      </div>
    </>
  )
})

// 💡 html`` の戻り値を c.html() で包まず、直接返すことで
// HTMXが解釈可能なHTMLとしてレスポンスします
test10.get('/list', (c) => {
  const baseUrl = c.req.path.replace(/\/list$/, '/');
  const samples = ['東京都', '神奈川県', '埼玉県', '千葉県'];

  return c.html(html`
    <div style="background: #f9fafb;">
      <div style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee; font-size: 0.8rem;">エリアを選択</div>
      ${samples.map(name => html`
        <div 
          onclick="window.location.href='${baseUrl}?area_name=${encodeURIComponent(name)}'"
          style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee; font-size: 0.9rem;"
          onmouseover="this.style.background='#eff6ff'"
          onmouseout="this.style.background='none'"
        >
          ${name}
        </div>
      `)}
      <button 
        hx-get="${baseUrl}btn?area_name=${encodeURIComponent(c.req.query('area_name') || 'エリアを選択')}" 
        hx-target="#area-drilldown-root" 
        style="width:100%; padding: 8px; border:none; background:#eee; cursor:pointer; font-size: 0.8rem;"
      >
        戻る
      </button>
    </div>
  `)
})

// 戻るボタン用のエンドポイント（元のボタンの形に戻す）
test10.get('/btn', (c) => {
  const baseUrl = c.req.path.replace(/\/btn$/, '/');
  const selectedArea = c.req.query('area_name') || 'エリアを選択';
  
  return c.html(html`
    <button 
      hx-get="${baseUrl}list" 
      hx-target="#area-drilldown-root"
      style="width: 100%; padding: 10px; text-align: left; cursor: pointer;"
    >
      ${selectedArea} ❯
    </button>
  `)
})