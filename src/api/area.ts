/**
 * [File Path] src/api/area.ts
 * [Role] Returns HTML fragments for the area selection dropdown.
 *        Supports a "click anywhere on the row" UX.
 */
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
    display: block; width: 100%; padding: 0;
    transition: background 0.2s; border-bottom: 1px solid #f9fafb;
    cursor: pointer;
  }
  .area-dropdown-item:last-child { border-bottom: none; }
  .area-dropdown-item:hover { background: #f3f4f6; }
  
  .item-content {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 16px; font-size: 0.95rem; color: #374151;
  }
  .item-arrow { color: #94a3b8; font-size: 0.8rem; }

  .menu-backdrop {
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    z-index: 90; background: transparent;
  }
`

areaApp.get('/', (c) => {
  const level = c.req.query('level')
  const regionName = c.req.query('region')

  // Close the menu
  if (level === 'close') return c.html(html``)

  let items: string[] = []
  const isRegion = level === 'region'

  if (isRegion) {
    items = Object.keys(SEARCH_MASTER.region.options)
  } else if (level === 'pref' && regionName) {
    const regionEntry = Object.entries(SEARCH_MASTER.region.options).find(([name]) => name === regionName)
    items = regionEntry?.[1].id ? (JP_REGIONS as any)[regionEntry[1].id] : []
  }

  const listItems = items.map((name) => {
    const encodedName = encodeURIComponent(name)
    
    /**
     * ⭐️ 修正ポイント：
     * 都道府県(pref)レベルの時は hx-get を捨て、通常の href リンクにします。
     */
    if (isRegion) {
      // 地方選択（北海道、東北など）はまだメニュー内を遷移するので HTMX を継続
      return html`
        <li class="area-dropdown-item" 
            hx-get="/api/area?level=pref&region=${encodedName}" 
            hx-target="#area-menu-target">
          <div class="item-content">
            <span>${name}</span>
            <span class="item-arrow">＞</span>
          </div>
        </li>`
    } else {
      // 都道府県選択（東京都、大阪府など）は、フルリロードでページ遷移させる
      return html`
        <li class="area-dropdown-item">
          <a href="/?area=${encodedName}" style="text-decoration: none; color: inherit; display: block; width: 100%;">
            <div class="item-content">
              <span>${name}</span>
            </div>
          </a>
        </li>`
    }
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