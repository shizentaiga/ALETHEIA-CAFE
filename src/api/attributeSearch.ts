// src/api/attributeSearch.ts

import { Hono } from 'hono'
import { html } from 'hono/html'
import { UNIQUE_FEATURES, INFRA_FEATURES } from '../db/queries/transformers'
import { getNormalizedAttributes, createSearchUrl } from '../lib/searchUtils'

const CONFIG = {
  ids: { targetRoot: '#attribute-search-root' },
  labels: {
    headerTitle: '特徴・設備で絞り込む',
    sectionUnique: '✨ 注目の特徴',
    sectionInfra: ' 設備・サービス'
  },
  design: {
    maxHeight: '320px',
    colors: {
      border: '#f3f4f6',
      borderLight: '#f9fafb',
      textDark: '#111827',
      textMuted: '#4b5563',
      textLight: '#9ca3af',
      bgLight: '#f9fafb',
      bgWhite: '#fff',
      hoverBg: '#f9fafb'
    }
  }
} as const

const attributeApi = new Hono()

attributeApi.get('/', async (c) => {
  const currentParams = new URLSearchParams(c.req.query())
  const selectedAttrs = getNormalizedAttributes(c.req.queries('attrs'))

  // 1. ×ボタン用のパス（open_attrsだけを削除）
  const closeParams = new URLSearchParams(currentParams.toString())
  closeParams.delete('open_attrs')
  const closeUrl = closeParams.toString() ? `/?${closeParams.toString()}` : '/'

  // 2. チェックボックスのトグル用URL生成
  const toggleAttributeUrl = (key: string) => {
    let nextAttrs = [...selectedAttrs]
    if (nextAttrs.includes(key as any)) {
      nextAttrs = nextAttrs.filter(a => a !== key)
    } else {
      nextAttrs.push(key as any)
    }

    const nextQuery = createSearchUrl(currentParams, { attrs: nextAttrs })
    const finalQuery = nextQuery ? `${nextQuery}&open_attrs=1` : '?open_attrs=1'
    return `/${finalQuery}`
  }

  return c.html(html`
    <div class="attribute-modal-container">
      <style>
        .attr-header-ui { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid ${CONFIG.design.colors.border}; font-size: 0.85rem; font-weight: 600; color: ${CONFIG.design.colors.textDark}; background: ${CONFIG.design.colors.bgLight}; }
        .attr-list-scroll { max-height: ${CONFIG.design.maxHeight}; overflow-y: auto; padding: 8px 0; }
        .attr-section-title { font-size: 0.75rem; font-weight: 700; color: ${CONFIG.design.colors.textLight}; padding: 8px 16px 4px 16px; text-transform: uppercase; letter-spacing: 0.05em; }
        .attr-item-ui { width: 100%; padding: 10px 16px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: ${CONFIG.design.colors.textMuted}; cursor: pointer; border-bottom: 1px solid ${CONFIG.design.colors.borderLight}; transition: background 0.1s; text-align: left; background: ${CONFIG.design.colors.bgWhite}; }
        .attr-item-ui:hover { background: ${CONFIG.design.colors.hoverBg}; }
        .attr-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #0070f3; }
        .attr-label-text { flex: 1; cursor: pointer; }
      </style>

      <div class="attr-header-ui">
        <div>${CONFIG.labels.headerTitle}</div>
        <!-- 💡 HTMXを使用して画面全体(body)をSPA風に非同期遷移させ、URL履歴もプッシュします -->
        <span style="cursor:pointer; color:${CONFIG.design.colors.textLight}; padding: 0 4px;" 
              hx-get="${closeUrl}" 
              hx-target="body" 
              hx-push-url="true">×</span>
      </div>

      <div class="attr-list-scroll">
        
        <div class="attr-section-title">${CONFIG.labels.sectionUnique}</div>
        ${UNIQUE_FEATURES.map(item => {
          const isChecked = selectedAttrs.includes(item.key as any)
          const targetUrl = toggleAttributeUrl(item.key)
          return html`
            <!-- 💡 行全体をクリックした時に、ページ全体を非同期リロードするようにHTMX化 -->
            <div class="attr-item-ui" hx-get="${targetUrl}" hx-target="body" hx-push-url="true">
              <input type="checkbox" class="attr-checkbox" ${isChecked ? 'checked' : ''} 
                hx-get="${targetUrl}" hx-target="body" hx-push-url="true"
                onclick="event.stopPropagation(); this.parentElement.click();" />
              <span class="attr-label-text">${item.label}</span>
            </div>
          `
        })}

        <div class="attr-section-title">${CONFIG.labels.sectionInfra}</div>
        ${INFRA_FEATURES.map(item => {
          const isChecked = selectedAttrs.includes(item.key as any)
          const targetUrl = toggleAttributeUrl(item.key)
          return html`
            <div class="attr-item-ui" hx-get="${targetUrl}" hx-target="body" hx-push-url="true">
              <input type="checkbox" class="attr-checkbox" ${isChecked ? 'checked' : ''} 
                hx-get="${targetUrl}" hx-target="body" hx-push-url="true"
                onclick="event.stopPropagation(); this.parentElement.click();" />
              <span class="attr-label-text">${item.label}</span>
            </div>
          `
        })}

      </div>
    </div>
  `)
})

export default attributeApi