/**
 * [File Path] src/pages/TopHeader.tsx
 * [Role] Header component with global search and authentication links.
 * [Notes] Integrated with getNormalizedKeywords and HTMX OOB logic to prevent recursion.
 */
import type { FC } from 'hono/jsx'
import { useRequestContext } from 'hono/jsx-renderer'
import { HeaderSearch } from './header/HeaderSearch'
import { HeaderAuth } from './header/HeaderAuth'
import { headerStyle } from './header/styles'
import { getNormalizedKeywords } from '../lib/search'

import { SearchResult } from '../components/SearchResult'

// --- Configuration ---
const CONFIG = {
  logoText: 'ALETHEIA',
  placeholder: 'キーワードで検索..',
  loginLabel: 'ログイン',
  logoutLabel: 'ログアウト'
} as const

export const TopHeader: FC<{
  user?: any,
  results?: any[],
  total?: number, 
  area?: string, // Propsとしての定義
  q?: string 
}> = ({ user, results = [], total = 0, area: propsArea, q }) => {
  const c = useRequestContext()
  
  /**
   * [HTMX Check]
   * Detect if the request is from HTMX.
   */
  const isHtmx = c.req.header('HX-Request') === 'true'

  /**
   * [Logic] Normalize keywords and area.
   * Props由来の値を優先し、なければリクエストパラメータから取得します。
   */
  const qParams = c.req.queries('q')
  const keywords = getNormalizedKeywords(qParams)
  
  // 変数名の衝突を避けるため、最終的な area 値を決定
  const area = propsArea || c.req.query('area') || ''

  // --- Render Fragment for HTMX ---
  if (isHtmx) {
    return (
      <>
        {/* 1. メインターゲット (#search-result-module) に流し込む検索結果 */}
        <SearchResult results={results} total={total} area={area} q={q} />

        {/* 2. OOB (Out-of-Band) でヘッダー内のチップのみを更新する */}
        <HeaderSearch 
          keywords={keywords} 
          placeholder={CONFIG.placeholder} 
          area={area} 
        />
      </>
    )
  }  

  // --- Render Full Header for Initial Page Load ---
  return (
    <header class="header-container">
      <style>{headerStyle}</style>

      {/* 1. Brand Logo */}
      <a href="/" class="header-logo" style="text-decoration: none;">
        {CONFIG.logoText}
      </a>

      {/* 2. Search Form */}
      <HeaderSearch 
        keywords={keywords} 
        placeholder={CONFIG.placeholder} 
        area={area} 
      />

      {/* 3. Authentication Links */}
      <HeaderAuth 
        user={user} 
        loginLabel={CONFIG.loginLabel} 
        logoutLabel={CONFIG.logoutLabel} 
      />
    </header>
  )
}