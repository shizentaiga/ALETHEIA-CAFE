import type { FC } from 'hono/jsx'
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
 * 階層を一段深く保持し、自己完結型のドリルダウン入り口を提供します。
 */
export const SearchArea: FC<{ class?: string }> = ({ class: className }) => (
  <div class={`search-area-module ${className || ''}`}>
    <style>{moduleStyle}</style>

    <button 
      class="search-trigger" 
      type="button"
      hx-get="/api/area?level=region"   /* 地方リストを取得 */
      hx-target="#area-menu-target"    /* 直下のコンテナに出力 */
      hx-trigger="click"
    >
      <div class="trigger-content">
        <span>{LABELS.icon}</span>
        <span>{SEARCH_MASTER.region.title}</span>
      </div>
      <span class="trigger-arrow">▼</span>
    </button>

    {/* 階層を深くしたことで、ボタンのすぐ隣にターゲットが存在します。
      APIはこの中に <ul> などのリストを直接流し込みます。
    */}
    <div id="area-menu-target"></div>
  </div>
)