/**
 * [File Path] src/components/SearchArea.tsx
 * [Role] UI component for area selection dropdown using HTMX.
 */
import type { FC } from 'hono/jsx'
import { useRequestContext } from 'hono/jsx-renderer'
import { SEARCH_MASTER } from '../lib/constants'

const moduleStyle = `
  .search-area-module {
    position: relative;
    width: 100%;
  }

  .search-trigger {
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    background: #fff;
    text-align: left;
    font-size: 0.9rem;
    color: #64748b;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background 0.2s;
  }

  .search-trigger:hover {
    background: #f9fafb;
  }

  .trigger-content {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .trigger-arrow {
    font-size: 0.8rem;
    color: #94a3b8;
  }

  #area-menu-target {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    z-index: 100;
    margin-top: 4px;
  }
`

const LABELS = {
  icon: "📍"
}

// 修正：propsを受け取れるように変更
export const SearchArea: FC<{ class?: string, currentArea?: string }> = ({ class: className, currentArea }) => {
  const c = useRequestContext()

  /**
   * Extract current area from URL.
   * Uses HX-Current-URL for HTMX requests and c.req.url for full page loads.
   */
  const currentUrl = c.req.header('HX-Current-URL') || c.req.url
  const urlObj = new URL(currentUrl)
  const areaParam = urlObj.searchParams.get('area')
  
  /**
   * 表示ラベルの決定ロジック
   * 1. URLパラメータがあればそれを優先（ユーザー選択）
   * 2. なければ TopPage で判定した currentArea (CDN値) を使用
   * 3. どちらもなければデフォルトのタイトルを表示
   */
  const resolvedArea = areaParam ? decodeURIComponent(areaParam) : currentArea
  const displayLabel = resolvedArea || SEARCH_MASTER.region.title

  return (
    <div class={`search-area-module ${className || ''}`}>
      <style>{moduleStyle}</style>

      <button 
        class="search-trigger" 
        type="button"
        hx-get="/api/area?level=region"
        hx-target="#area-menu-target"
        hx-trigger="click"
      >
        <div class="trigger-content">
          <span>{LABELS.icon}</span>
          <span>{displayLabel}</span>
        </div>
        <span class="trigger-arrow">▼</span>
      </button>

      {/* Target for HTMX dropdown injection */}
      <div id="area-menu-target"></div>
    </div>
  )
}