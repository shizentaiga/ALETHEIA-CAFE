import type { FC } from 'hono/jsx'
import { useRequestContext } from 'hono/jsx-renderer' // ★追加
import { SEARCH_MASTER } from '../lib/constants'

const moduleStyle = `
  /* 階層を深くし、このコンテナ内で全てを完結させる */
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

  /* APIから返ってくるリストの展開先 */
  #area-menu-target {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    z-index: 100;
    margin-top: 4px;
    /* 初回クリックまで余計な余白を作らない */
  }
`

const LABELS = {
  icon: "📍"
}

/**
 * SearchArea Component
 * Provides a self-contained dropdown for area selection.
 * Now dynamically updates its label based on the "area" URL parameter.
 */
export const SearchArea: FC<{ class?: string }> = ({ class: className }) => {
  
  // ⭐️ 1. 元のロジックに戻す
  const c = useRequestContext()
  const currentArea = c.req.query('area')
  
  // ⭐️ 2. 元の判定に戻す
  const displayLabel = currentArea ? decodeURIComponent(currentArea) : SEARCH_MASTER.region.title

  // ⭐️ 3. id="search-area-container" を削除し、以前の状態に戻す
  return (
    <div class={`search-area-module ${className || ''}`}>
      <style>{moduleStyle}</style>

      <button 
        class="search-trigger" 
        type="button"
        hx-get="/api/area?level=region"   /* Fetch region list */
        hx-target="#area-menu-target"    /* Target the container below */
        hx-trigger="click"
      >
        <div class="trigger-content">
          <span>{LABELS.icon}</span>
          {/* ⭐️ 4. ここが固定文字から、変数 displayLabel に変わりました */}
          <span>{displayLabel}</span>
        </div>
        <span class="trigger-arrow">▼</span>
      </button>

      {/* 
        The dropdown menu from the API will be injected here.
        Because it's inside the same module, positioning is much more stable.
      */}
      <div id="area-menu-target"></div>
    </div>
  )
}