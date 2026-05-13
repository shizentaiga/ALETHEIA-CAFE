import { Hono } from 'hono'
import { html } from 'hono/html'
import { dbQueries } from '../db/queries/main'
import { createSearchUrl } from '../lib/searchUtils'

const areaApi = new Hono<{ Bindings: { ALETHEIA_CAFE_DB: D1Database } }>()

areaApi.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB

  // 💡 '00' が来た場合も parentId は null として扱い、初期リストを表示させる
  const rawParentId = c.req.query('parent_id');
  const parentId = (rawParentId === '00' || !rawParentId) ? null : rawParentId;
  
  const currentParams = new URLSearchParams(c.req.query());
  const searchBaseParams = new URLSearchParams(currentParams.toString());
  searchBaseParams.delete('parent_id');

  const { results: subAreas } = await dbQueries.getSubAreas(db, parentId)
  const parentArea = parentId ? await dbQueries.getAreaInfo(db, parentId) : null

  // 戻るための設定
  const getBackParentId = (id: string | null) => {
    if (!id || !id.includes('-')) return null;
    return id.split('-').slice(0, -1).join('-');
  };
  const backId = getBackParentId(parentId);
  const suffix = searchBaseParams.toString() ? `&${searchBaseParams.toString()}` : '';

  return c.html(html`
    <div class="area-list-container">
        <style>
            .area-header-ui { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 0.85rem; font-weight: 600; color: #111827; background: #f9fafb; }
            .area-list-scroll { max-height: 300px; overflow-y: auto; }
            .area-item-ui { width: 100%; padding: 12px 16px; border: none; background: #fff; display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: #4b5563; cursor: pointer; border-bottom: 1px solid #f9fafb; }
            .area-item-ui:hover { background: #f3f4f6; color: #0070f3; }
            .back-icon { cursor: pointer; padding-right: 8px; color: #9ca3af; }
        </style>

        <div class="area-header-ui">
            <div>
                ${parentId ? html`<span class="back-icon" hx-get="/api/area-drilldown?parent_id=${backId || ''}${suffix}" hx-target="#area-drilldown-root">←</span>` : ''}
                ${parentArea ? parentArea.name : 'エリアを選択'}
            </div>
            <span style="cursor:pointer; color:#9ca3af;" onclick="window.location.href='/'">×</span>
        </div>

        <div class="area-list-scroll">
            <!-- 💡 1. 初期状態（地方選択）の時だけ「全国」ボタンを先頭に出現させる -->
            ${!parentId ? html`
                <button class="area-item-ui area-item-all" 
                    onclick="window.location.href='${createSearchUrl(searchBaseParams, { area: '00', areaName: null })}'">
                    <span>📍 全国（すべて）</span>
                    <span style="font-size: 0.7rem; color: #d1d5db;">❯</span>
                </button>
            ` : ''}

            <!-- 💡 2. 各地方・都道府県の「すべて」対応 -->
            ${parentArea ? html`
                <button class="area-item-ui area-item-all" 
                    onclick="window.location.href='${createSearchUrl(searchBaseParams, { area: parentArea.area_id, areaName: parentArea.name })}'">
                    <span>📍 ${parentArea.name}すべて</span>
                    <span style="font-size: 0.7rem; color: #d1d5db;">❯</span>
                </button>
            ` : ''}

            ${subAreas.map(area => {
                // 💡 常に検索URLを作成し、かつ parent_id を付与してリロードさせる
                const nextUrl = createSearchUrl(searchBaseParams, { area: area.area_id });
                const finalUrl = `${nextUrl}&parent_id=${area.area_id}`;
                
                return html`
                    <button class="area-item-ui" onclick="window.location.href='${finalUrl}'">
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