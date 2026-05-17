// src/api/areaDrilldown.ts

import { Hono } from 'hono'
import { html } from 'hono/html'
import { dbQueries } from '../db/queries/main'
import { createSearchUrl } from '../lib/searchUtils'

// 💡 外部から変更しやすいよう、上部に定数を集約
const CONFIG = {
  api: { basePath: '/api/area-drilldown' },
  ids: { targetRoot: '#area-drilldown-root' },
  labels: {
    defaultTitle: 'エリアを選択',
    allJapan: '📍 全国（すべて）',
    suffixAll: 'すべて'
  },
  design: {
    maxHeight: '300px',
    colors: {
      border: '#f3f4f6',
      borderLight: '#f9fafb',
      textDark: '#111827',
      textMuted: '#4b5563',
      textLight: '#9ca3af',
      textArrow: '#d1d5db',
      bgLight: '#f9fafb',
      bgWhite: '#fff',
      hoverBg: '#f3f4f6',
      hoverText: '#0070f3'
    }
  }
} as const

const areaApi = new Hono<{ Bindings: { ALETHEIA_CAFE_DB: D1Database } }>()

areaApi.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB

  // 💡 '00' が来た場合も parentId は null として扱い、初期リストを表示させる
  const rawParentId = c.req.query('parent_id');
  const parentId = (rawParentId === '00' || !rawParentId) ? null : rawParentId;
  
//   const currentParams = new URLSearchParams(c.req.query());
//   const searchBaseParams = new URLSearchParams(currentParams.toString());
//   searchBaseParams.delete('parent_id');
  // 💡 Honoの生のURLからパラメータを構築することで、attrsなどの配列やカンマ区切りを無傷で完全取得
  const searchBaseParams = new URL(c.req.url).searchParams;
  searchBaseParams.delete('parent_id'); // ドリルダウン制御用のキーだけを除外（attrsやqは残る）

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
            .area-header-ui { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid ${CONFIG.design.colors.border}; font-size: 0.85rem; font-weight: 600; color: ${CONFIG.design.colors.textDark}; background: ${CONFIG.design.colors.bgLight}; }
            .area-list-scroll { max-height: ${CONFIG.design.maxHeight}; overflow-y: auto; }
            .area-item-ui { width: 100%; padding: 12px 16px; border: none; background: ${CONFIG.design.colors.bgWhite}; display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; color: ${CONFIG.design.colors.textMuted}; cursor: pointer; border-bottom: 1px solid ${CONFIG.design.colors.borderLight}; }
            .area-item-ui:hover { background: ${CONFIG.design.colors.hoverBg}; color: ${CONFIG.design.colors.hoverText}; }
            .back-icon { cursor: pointer; padding-right: 8px; color: ${CONFIG.design.colors.textLight}; }
        </style>

        <div class="area-header-ui">
            <div>
                ${parentId ? html`<span class="back-icon" hx-get="${CONFIG.api.basePath}?parent_id=${backId || ''}${suffix}" hx-target="${CONFIG.ids.targetRoot}">←</span>` : ''}
                ${parentArea ? parentArea.name : CONFIG.labels.defaultTitle}
            </div>
            <span style="cursor:pointer; color:${CONFIG.design.colors.textLight};" onclick="window.location.href='/'">×</span>
        </div>

        <div class="area-list-scroll">
            ${!parentId ? html`
                <button class="area-item-ui area-item-all" 
                    onclick="window.location.href='${createSearchUrl(searchBaseParams, { area: '00', areaName: null })}'">
                    <span>${CONFIG.labels.allJapan}</span>
                    <span style="font-size: 0.7rem; color: ${CONFIG.design.colors.textArrow};">❯</span>
                </button>
            ` : ''}

            ${parentArea ? html`
                <button class="area-item-ui area-item-all" 
                    onclick="window.location.href='${createSearchUrl(searchBaseParams, { area: parentArea.area_id, areaName: parentArea.name })}'">
                    <span>📍 ${parentArea.name}${CONFIG.labels.suffixAll}</span>
                    <span style="font-size: 0.7rem; color: ${CONFIG.design.colors.textArrow};">❯</span>
                </button>
            ` : ''}

            ${subAreas.map(area => {
                // 💡 常に検索URLを作成し、かつ parent_id を付与してリロードさせる
                const nextUrl = createSearchUrl(searchBaseParams, { area: area.area_id });
                const finalUrl = `${nextUrl}&parent_id=${area.area_id}`;
                
                return html`
                    <button class="area-item-ui" onclick="window.location.href='${finalUrl}'">
                        <span>${area.name}</span>
                        <span style="font-size: 0.7rem; color: ${CONFIG.design.colors.textArrow};">❯</span>
                    </button>
                `;
            })}
        </div>
    </div>
  `);
})

export default areaApi