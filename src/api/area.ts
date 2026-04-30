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
     * [UX Logic]
     * Region level: Clicking the row moves to the "Prefecture list" (does not search yet).
     * Prefecture level: Clicking the row "triggers the search" and closes the menu.
     */
    const actionAttr = isRegion
      ? html`
          hx-get="/api/area?level=pref&region=${encodedName}"
          hx-target="#area-menu-target"
        `
      : html`
          /* ⭐️ マルチターゲットを解除し、元に戻す */
          hx-get="/?area=${encodedName}"
          hx-target="#search-result-module"
          hx-include="#q-input-header" // 💡 Get the keyword from the search input ID
          hx-push-url="true"
          hx-on::after-request="document.getElementById('area-menu-target').innerHTML = ''"
        `

    return html`
      <li class="area-dropdown-item" ${actionAttr}>
        <div class="item-content">
          <span>${name}</span>
          ${isRegion ? html`<span class="item-arrow">＞</span>` : ''}
        </div>
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