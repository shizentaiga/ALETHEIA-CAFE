// src/api/areaDrilldown.ts

import { Hono } from 'hono'
import { html } from 'hono/html'
import { dbQueries } from '../db/queries/main'

const areaApi = new Hono<{ Bindings: { ALETHEIA_CAFE_DB: D1Database } }>()

areaApi.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB
  const parentId = c.req.query('parent_id') || null

  const { results: subAreas } = await dbQueries.getSubAreas(db, parentId)
  const parentArea = parentId ? await dbQueries.getAreaInfo(db, parentId) : null

  return c.html(html`
    <div class="area-list-container">
        <style>
        .area-header-ui {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 16px; border-bottom: 1px solid #f3f4f6;
            font-size: 0.85rem; font-weight: 600; color: #111827; background: #f9fafb;
        }
        .area-list-scroll { max-height: 300px; overflow-y: auto; }
        .area-item-ui {
            width: 100%; padding: 12px 16px; border: none; background: #fff;
            display: flex; justify-content: space-between; align-items: center;
            font-size: 0.9rem; color: #4b5563; cursor: pointer; border-bottom: 1px solid #f9fafb;
        }
        .area-item-ui:hover { background: #f3f4f6; color: #0070f3; }
        .back-icon { cursor: pointer; padding-right: 8px; color: #9ca3af; }
        </style>

        <div class="area-header-ui">
        <div>
            ${parentArea ? html`<span class="back-icon" hx-get="/api/area-drilldown" hx-target="#area-drilldown-root">←</span>` : ''}
            ${parentArea ? parentArea.name : 'エリアを選択'}
        </div>
        <span style="cursor:pointer; color:#9ca3af;" onclick="location.reload()">×</span>
        </div>

        <div class="area-list-scroll">
        ${subAreas.map(area => {
            // 市区町村(Level 3)の場合は、HTMXではなく通常のページ遷移(検索実行)を行う
            if (area.area_level === 3) {
                return html`
                    <button class="area-item-ui" onclick="window.location.href='/?area=${area.area_id}'">
                        <span>${area.name}</span>
                    </button>
                `;
            }
            // それ以外(大エリア・都道府県)は、現在の正常な動作(HTMXによるドリルダウン)を継続
            return html`
                <button class="area-item-ui" hx-get="/api/area-drilldown?parent_id=${area.area_id}" hx-target="#area-drilldown-root">
                    <span>${area.name}</span>
                    <span style="font-size: 0.7rem; color: #d1d5db;">❯</span>
                </button>
            `;
        })}
        </div>
    </div>
    `);
})

export default areaApi