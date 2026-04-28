/**
 * [File Path] src/api/area.ts
 * [Role] エリア選択ドリルダウンのHTML断片を返却
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

  // メニューを閉じる処理
  if (level === 'close') return c.html(html``)

  let items: string[] = []
  if (level === 'region') {
    items = Object.keys(SEARCH_MASTER.region.options)
  } else if (level === 'pref' && regionName) {
    const regionEntry = Object.entries(SEARCH_MASTER.region.options).find(([name]) => name === regionName)
    // SEARCH_MASTER の id をキーにして JP_REGIONS から都道府県リストを抽出
    items = regionEntry?.[1].id ? (JP_REGIONS as any)[regionEntry[1].id] : []
  }

  const listItems = items.map((name) => {
    const encodedName = encodeURIComponent(name)
    
    /**
     * 【修正ポイント】
     * 1. 宛先を TopPage (/) に変更
     * 2. クエリパラメータを fetchServices が期待する "area" に統一
     * 3. hx-push-url="true" でブラウザの履歴とURLを更新
     */
    const searchAttr = html`
      hx-get="/?area=${encodedName}"
      hx-target="#search-result-module"
      hx-push-url="true"
      hx-on::after-request="document.getElementById('area-menu-target').innerHTML = ''"
    `

    // 地方リスト表示時のみ詳細展開用の矢印を表示
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