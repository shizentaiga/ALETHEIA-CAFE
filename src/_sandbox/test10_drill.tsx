import { Hono } from 'hono'
import { html } from 'hono/html'

export const test10 = new Hono()

test10.get('/', (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;
  
  // 【本質1】URLパラメータから現在の状態を復元する
  const selectedArea = c.req.query('area_name') || 'エリアを選択';

  return c.render(
    <>
      <header><h1><a href={baseUrl}>ALETHEIA</a></h1></header>
      
      <div id="area-drilldown-root" style="border: 1px solid #000; width: 200px;">
        <button hx-get={`${baseUrl}list`} hx-target="#area-drilldown-root" hx-swap="innerHTML">
          {/* 復元した名前を表示 */}
          {selectedArea} ❯
        </button>
      </div>
    </>
  )
})

test10.get('/list', (c) => {
  const baseUrl = c.req.path.replace(/\/list$/, '/');
  const samples = ['東京都', '神奈川県', '埼玉県'];

  return c.html(html`
    <div>
      ${samples.map(name => html`
        <div 
          style="cursor: pointer; padding: 5px; border-bottom: 1px solid #ccc;"
          /* 【本質2】選択された名前をURLに付与して、ページごと「保存（遷移）」する */
          onclick="window.location.href='${baseUrl}?area_name=${encodeURIComponent(name)}'"
        >
          ${name}
        </div>
      `)}
    </div>
  `)
})