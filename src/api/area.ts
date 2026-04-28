import { Hono } from 'hono'
import { html } from 'hono/html'
import { SEARCH_MASTER } from '../lib/constants'

const areaApp = new Hono()

/**
 * スタイル定義
 */
const menuStyle = `
  .area-dropdown-list {
    list-style: none; padding: 8px 0; margin: 0;
    background: #ffffff; border: 1px solid #e5e7eb;
    border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  .area-dropdown-item {
    padding: 12px 16px; cursor: pointer; font-size: 0.95rem; color: #374151;
  }
  .area-dropdown-item:hover { background: #f3f4f6; color: #111827; }
`

/**
 * 地方（Region）リストを返すエンドポイント
 */
areaApp.get('/', (c) => {
  const level = c.req.query('level')

  if (level !== 'region') {
    return c.text('Invalid level', 400)
  }

  const regions = Object.keys(SEARCH_MASTER.region.options)

  // 1. 各アイテムのHTMLを先に生成（hx-属性を文字列として安全に扱う）
  const listItems = regions.map((name) => {
    const encodedName = encodeURIComponent(name)
    return html`
      <li 
        class="area-dropdown-item"
        hx-get="/api/area?level=pref&region=${encodedName}"
        hx-target="#area-menu-target"
        hx-swap="innerHTML"
      >
        ${name}
      </li>
    `
  })

  // 2. 全体を統合して返す
  return c.html(html`
    <div class="area-menu-wrapper">
      <style>${menuStyle}</style>
      <ul class="area-dropdown-list">
        ${listItems}
      </ul>
    </div>
  `)
})

export default areaApp