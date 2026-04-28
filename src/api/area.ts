import { Hono } from 'hono'
import { html } from 'hono/html'
import { SEARCH_MASTER, JP_REGIONS } from '../lib/constants'

const areaApp = new Hono()

const menuStyle = `
  .area-menu-wrapper {
    position: absolute; top: 100%; left: 0; width: 100%;
    z-index: 100; margin-top: 4px;
  }
  .area-dropdown-list {
    list-style: none; padding: 4px 0; margin: 0;
    background: #ffffff; border: 1px solid #e5e7eb;
    border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  .area-dropdown-item {
    display: flex; align-items: center; padding: 0;
    transition: background 0.2s; border-bottom: 1px solid #f9fafb;
  }
  .area-dropdown-item:last-child { border-bottom: none; }
  
  /* 左側：確定エリア */
  .item-label {
    flex: 1; padding: 12px 16px; font-size: 0.95rem; color: #374151; cursor: pointer;
  }
  .item-label:hover { background: #f3f4f6; color: #111827; }

  /* 右側：詳細エリア（矢印） */
  .item-arrow {
    padding: 12px 20px; color: #94a3b8; cursor: pointer;
    font-size: 0.8rem; border-left: 1px solid #f3f4f6;
    transition: all 0.2s;
  }
  .item-arrow:hover { background: #eff6ff; color: #3b82f6; }

  .menu-backdrop {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: 90; background: transparent;
  }
`

areaApp.get('/', (c) => {
  const level = c.req.query('level')
  const regionName = c.req.query('region')

  if (level === 'close') return c.html(html``)

  let items: string[] = []
  if (level === 'region') {
    items = Object.keys(SEARCH_MASTER.region.options)
  } else if (level === 'pref' && regionName) {
    const regionEntry = Object.entries(SEARCH_MASTER.region.options).find(([name]) => name === regionName)
    items = regionEntry?.[1].id ? (JP_REGIONS as any)[regionEntry[1].id] : []
  }

  const listItems = items.map((name) => {
    const encodedName = encodeURIComponent(name)
    
    // 1. 地名をクリック：即時確定（メニューを消すためのJavaScript1行を同梱）
    const searchAttr = html`
      hx-get="/api/search?${level === 'region' ? 'region' : 'pref'}=${encodedName}"
      hx-target="#search-result-module"
      hx-on::after-request="document.getElementById('area-menu-target').innerHTML = ''"
    `

    // 2. 矢印をクリック：次の階層へ（地方リストの時だけ表示）
    const arrowBox = level === 'region' ? html`
      <div class="item-arrow" 
           hx-get="/api/area?level=pref&region=${encodedName}" 
           hx-target="#area-menu-target">
        ＞
      </div>
    ` : html``

    return html`
      <li class="area-dropdown-item">
        <div class="item-label" ${searchAttr}>${name}</div>
        ${arrowBox}
      </li>`
  })

  return c.html(html`
    <style>${menuStyle}</style>
    <div class="menu-backdrop" hx-get="/api/area?level=close" hx-target="#area-menu-target"></div>
    <div class="area-menu-wrapper">
      <ul class="area-dropdown-list">${listItems}</ul>
    </div>
  `)
})

export default areaApp