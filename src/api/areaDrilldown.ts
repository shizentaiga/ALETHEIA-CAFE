// src/api/areaDrilldown.ts

import { Hono } from 'hono'
import { html } from 'hono/html'
import { dbQueries } from '../db/queries/main'
import { createSearchUrl } from '../lib/searchUtils' // 💡 ステップ1で作った関数

const areaApi = new Hono<{ Bindings: { ALETHEIA_CAFE_DB: D1Database } }>()

areaApi.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB
  const parentId = c.req.query('parent_id') || null
  
  // 💡 現在の全URLパラメータを取得（qなどが入っている）
  const currentParams = new URLSearchParams(c.req.query());
  // parent_id はドリルダウンの制御用なので、最終的な検索URLには含めないよう除外
  const searchBaseParams = new URLSearchParams(currentParams.toString());
  searchBaseParams.delete('parent_id');

  const { results: subAreas } = await dbQueries.getSubAreas(db, parentId)
  const parentArea = parentId ? await dbQueries.getAreaInfo(db, parentId) : null

  // 💡 HTMXの遷移先にも現在のクエリを引き継がせるための文字列
  const baseQueryString = searchBaseParams.toString();
  const hxQueryPrefix = baseQueryString ? `&${baseQueryString}` : '';

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
            ${parentArea ? html`
              <span class="back-icon" 
                    hx-get="/api/area-drilldown?${baseQueryString}" 
                    hx-target="#area-drilldown-root">←</span>` : ''}
            ${parentArea ? parentArea.name : 'エリアを選択'}
        </div>
        <span style="cursor:pointer; color:#9ca3af;" onclick="location.reload()">×</span>
        </div>

        <div class="area-list-scroll">
        
        ${subAreas.map(area => {
            if (area.area_level === 3) {
                // 💡 検索実行：現在のパラメータを維持しつつ area だけ更新
                const nextUrl = createSearchUrl(searchBaseParams, { area: area.area_id });
                return html`
                    <button class="area-item-ui" onclick="window.location.href='${nextUrl}'">
                        <span>${area.name}</span>
                    </button>
                `;
            }
            // 💡 次の階層へ：parent_id を指定しつつ、現在の他のパラメータ(qなど)も保持して送る
            return html`
                <button class="area-item-ui" 
                        hx-get="/api/area-drilldown?parent_id=${area.area_id}${hxQueryPrefix}" 
                        hx-target="#area-drilldown-root">
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