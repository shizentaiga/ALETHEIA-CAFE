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
    sectionInfra: ' 設備・サービス',
    submitBtn: 'この条件で検索する' // 💡 追加
  },
  design: {
    maxHeight: '280px', // 💡 ボタン用に少しスクロール領域を調整
    colors: {
      border: '#f3f4f6',
      borderLight: '#f9fafb',
      textDark: '#111827',
      textMuted: '#4b5563',
      textLight: '#9ca3af',
      bgLight: '#f9fafb',
      bgWhite: '#fff',
      hoverBg: '#f9fafb',
      primary: '#0070f3' // 💡 追加
    }
  }
} as const

const attributeApi = new Hono()

attributeApi.get('/', async (c) => {
  const selectedAttrs = getNormalizedAttributes(c.req.queries('attrs'))
  
  const currentParams = new URLSearchParams()
  const allQueries = c.req.query()
  for (const key in allQueries) {
    if (key === 'attrs') {
      const attrsArr = c.req.queries('attrs') || []
      attrsArr.forEach(val => currentParams.append('attrs', val))
    } else {
      currentParams.set(key, allQueries[key])
    }
  }

  const closeParams = new URLSearchParams(currentParams.toString())
  closeParams.delete('open_attrs')
  const closeUrl = closeParams.toString() ? `/?${closeParams.toString()}` : '/'

  // 💡 【設計変更】チェックボックスを押した時は「画面リロード」させず、
  // 単にこのモーダル内の対応するチェックボックスのURL（API宛て）を叩いて
  // モーダルの中身（チェック状態）だけを部分更新するパスを作る。
  const toggleAttributeUrl = (key: string) => {
    const apiParams = new URLSearchParams(currentParams.toString())
    let nextAttrs = [...selectedAttrs]
    
    if (nextAttrs.includes(key as any)) {
      nextAttrs = nextAttrs.filter(a => a !== key)
    } else {
      nextAttrs.push(key as any)
    }

    // APIのパス（/api/attribute-search）を維持したまま、attrsを組み立てる
    apiParams.delete('attrs')
    nextAttrs.forEach(a => apiParams.append('attrs', a))
    apiParams.set('open_attrs', '1')
    return `/api/attribute-search?${apiParams.toString()}`
  }

  // 💡 【決定ボタン用URL】最後に本当にTOP画面を検索リロードさせるためのURL
  const getSubmitUrl = () => {
    const baseParams = new URLSearchParams(currentParams.toString())
    baseParams.delete('open_attrs') // モーダルは閉じるので削除
    
    const nextQuery = createSearchUrl(baseParams, { attrs: selectedAttrs })
    return nextQuery ? `/${nextQuery}` : '/'
  }

  return c.html(html`
    <div class="attribute-modal-container">
      <style>
        .attr-header-ui { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid ${CONFIG.design.colors.border}; font-size: 0.85rem; font-weight: 600; color: ${CONFIG.design.colors.textDark}; background: ${CONFIG.design.colors.bgLight}; }
        .attr-list-scroll { max-height: ${CONFIG.design.maxHeight}; overflow-y: auto; padding: 8px 0; }
        .attr-section-title { font-size: 0.75rem; font-weight: 700; color: ${CONFIG.design.colors.textLight}; padding: 8px 16px 4px 16px; text-transform: uppercase; letter-spacing: 0.05em; }
        .attr-item-ui { width: 100%; padding: 10px 16px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: ${CONFIG.design.colors.textMuted}; cursor: pointer; border-bottom: 1px solid ${CONFIG.design.colors.borderLight}; transition: background 0.1s; text-align: left; background: ${CONFIG.design.colors.bgWhite}; border: none; }
        .attr-item-ui:hover { background: ${CONFIG.design.colors.hoverBg}; }
        .attr-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: ${CONFIG.design.colors.primary}; }
        .attr-label-text { flex: 1; cursor: pointer; }
        
        /* 💡 決定ボタン用のスタイル */
        .attr-footer-ui { padding: 12px 16px; border-top: 1px solid ${CONFIG.design.colors.border}; background: ${CONFIG.design.colors.bgWhite}; }
        .attr-submit-btn { width: 100%; padding: 10px; background: ${CONFIG.design.colors.primary}; color: #fff; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; text-align: center; }
        .attr-submit-btn:hover { opacity: 0.9; }
      </style>

      <div class="attr-header-ui">
        <div>${CONFIG.labels.headerTitle}</div>
        <span style="cursor:pointer; color:${CONFIG.design.colors.textLight}; padding: 0 4px;" 
              onclick="window.location.href='${closeUrl}'">×</span>
      </div>

      <div class="attr-list-scroll">
        
        <div class="attr-section-title">${CONFIG.labels.sectionUnique}</div>
        ${UNIQUE_FEATURES.map(item => {
          const isChecked = selectedAttrs.includes(item.key as any)
          const targetUrl = toggleAttributeUrl(item.key)
          return html`
            <button class="attr-item-ui" hx-get="${targetUrl}" hx-target="#attribute-search-root">
              <input type="checkbox" class="attr-checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation();" style="pointer-events: none;" />
              <span class="attr-label-text">${item.label}</span>
            </button>
          `
        })}

        <div class="attr-section-title">${CONFIG.labels.sectionInfra}</div>
        ${INFRA_FEATURES.map(item => {
          const isChecked = selectedAttrs.includes(item.key as any)
          const targetUrl = toggleAttributeUrl(item.key)
          return html`
            <button class="attr-item-ui" hx-get="${targetUrl}" hx-target="#attribute-search-root">
              <input type="checkbox" class="attr-checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation();" style="pointer-events: none;" />
              <span class="attr-label-text">${item.label}</span>
            </button>
          `
        })}

      </div>

      <div class="attr-footer-ui">
        <button class="attr-submit-btn" onclick="window.location.href='${getSubmitUrl()}'">
          ${CONFIG.labels.submitBtn}
        </button>
      </div>
    </div>
  `)
})

export default attributeApi