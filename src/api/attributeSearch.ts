/**
 * [ファイルパス] src/api/attributeSearch.ts
 */

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
    submitBtn: 'この条件で検索する'
  },
  design: {
    maxHeight: '280px',
    colors: {
      border: '#f3f4f6',
      borderLight: '#f9fafb',
      textDark: '#111827',
      textMuted: '#4b5563',
      textLight: '#9ca3af',
      // 💡 ⑥ ヘッダー背景をほんの少し白寄りにしてグレー感を減らし、高級感を演出
      bgLight: '#fbfbfc', 
      bgWhite: '#fff',
      // 💡 ④ CTAボタンを「少しだけ軽く」して全体に馴染ませる (Slate-700 -> Slate-800)
      primary: '#334155',
      primaryHover: '#1e293b'
    }
  }
} as const

const attributeApi = new Hono()

attributeApi.get('/', async (c) => {
  // 💡 カンマ区切りの文字列を安全に配列化してから getNormalizedAttributes に引き渡す
  const rawQuery = c.req.query('attrs') || ''
  const parsedArray = rawQuery ? rawQuery.split(',') : []
  const selectedAttrs = getNormalizedAttributes(parsedArray as any)
  
  // URLSearchParamsを現在の全クエリから再構築（キー重複のトラップを回避）
  const currentParams = new URLSearchParams()
  const allQueries = c.req.query()
  for (const key in allQueries) {
    if (key === 'attrs') {
      if (selectedAttrs.length > 0) {
        currentParams.set('attrs', selectedAttrs.join(','))
      }
    } else {
      currentParams.set(key, allQueries[key])
    }
  }
  
  if (selectedAttrs.length > 0) {
    currentParams.set('attrs', selectedAttrs.join(','));
  } else {
    currentParams.delete('attrs');
  }

  // 1. ×ボタン用のパス（open_attrsだけを削除してTOPへ戻る）
  const closeParams = new URLSearchParams(currentParams.toString())
  closeParams.delete('open_attrs')
  const closeUrl = closeParams.toString() ? `/?${closeParams.toString()}` : '/'

  // 2. モーダル内でのチェックボックスのトグル用URL生成（HTMXの書き換え用）
  const toggleAttributeUrl = (key: string) => {
    const apiParams = new URLSearchParams(currentParams.toString())
    let nextAttrs = [...selectedAttrs]
    
    if (nextAttrs.includes(key as any)) {
      nextAttrs = nextAttrs.filter(a => a !== key)
    } else {
      nextAttrs.push(key as any)
    }

    apiParams.delete('attrs')
    if (nextAttrs.length > 0) {
      apiParams.set('attrs', nextAttrs.join(','))
    }
    apiParams.set('open_attrs', '1')
    return `/api/attribute-search?${apiParams.toString()}`
  }

  // 3. 【決定ボタン用URL】最後に本当にTOP画面を検索リロードさせるためのURL
  const getSubmitUrl = () => {
    const baseParams = new URLSearchParams(currentParams.toString())
    baseParams.delete('open_attrs')
    
    const nextQuery = createSearchUrl(baseParams, { attrs: selectedAttrs })
    return nextQuery ? `/${nextQuery}` : '/'
  }

  return c.html(html`
    <div class="attribute-modal-container">
      <style>
        .attr-header-ui { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid ${CONFIG.design.colors.border}; font-size: 0.85rem; font-weight: 600; color: ${CONFIG.design.colors.textDark}; background: ${CONFIG.design.colors.bgLight}; }
        .attr-list-scroll { max-height: ${CONFIG.design.maxHeight}; overflow-y: auto; padding: 8px 0; }
        
        /* 💡 ① section title を少し柔らかく調整（管理画面感を排除して洗練） */
        .attr-section-title { font-size: 0.72rem; font-weight: 600; color: #64748b; padding: 10px 16px 6px; letter-spacing: 0.02em; }
        
        /* 💡 ② hover をもっと静かに滑らかに＋トランジション付与 */
        .attr-item-ui { width: 100%; padding: 10px 16px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: ${CONFIG.design.colors.textMuted}; cursor: pointer; border-bottom: 1px solid ${CONFIG.design.colors.borderLight}; text-align: left; background: ${CONFIG.design.colors.bgWhite}; border: none; transition: background-color 0.12s ease, color 0.12s ease; }
        .attr-item-ui:hover { background: #fafbfc; }
        
        /* 💡 ⑤ checkbox をほんの少しだけ大きくしスマホのUXを最適化 */
        .attr-checkbox { width: 17px; height: 17px; cursor: pointer; accent-color: ${CONFIG.design.colors.primary}; }
        .attr-label-text { flex: 1; cursor: pointer; }
        
        /* 💡 「選択済み」アイテムの視認性とアプリ感を向上させるスタイリング */
        .attr-item-ui.is-selected { background: #f8fafc; }
        .attr-item-ui.is-selected .attr-label-text { color: #111827; font-weight: 500; }
        
        /* 💡 ③ footer の余白を広げ、ほんの少し浮かせる立体的なシャドウを追加 */
        .attr-footer-ui { padding: 14px 16px; border-top: 1px solid ${CONFIG.design.colors.border}; background: #fcfcfd; box-shadow: 0 -1px 0 rgba(0, 0, 0, 0.03); }
        .attr-submit-btn { width: 100%; padding: 10px; background: ${CONFIG.design.colors.primary}; color: #fff; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; text-align: center; transition: background-color 0.15s ease; }
        .attr-submit-btn:hover { background-color: ${CONFIG.design.colors.primaryHover}; }
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
          // 💡 isChecked の場合に 'is-selected' クラスを付与
          return html`
            <button class="attr-item-ui ${isChecked ? 'is-selected' : ''}" hx-get="${targetUrl}" hx-target="#attribute-search-root">
              <input type="checkbox" class="attr-checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation();" style="pointer-events: none;" />
              <span class="attr-label-text">${item.label}</span>
            </button>
          `
        })}

        <div class="attr-section-title">${CONFIG.labels.sectionInfra}</div>
        ${INFRA_FEATURES.map(item => {
          const isChecked = selectedAttrs.includes(item.key as any)
          const targetUrl = toggleAttributeUrl(item.key)
          // 💡 isChecked の場合に 'is-selected' クラスを付与
          return html`
            <button class="attr-item-ui ${isChecked ? 'is-selected' : ''}" hx-get="${targetUrl}" hx-target="#attribute-search-root">
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