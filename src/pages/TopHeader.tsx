/**
 * [File Path] src/pages/TopHeader.tsx
 * [Role] Header component with global search and authentication links.
 * [Notes] Integrated with getNormalizedKeywords and HTMX OOB logic to prevent recursion.
 */
import type { FC } from 'hono/jsx'
import { useRequestContext } from 'hono/jsx-renderer'
import { HeaderSearch } from './header/HeaderSearch'
import { HeaderAuth } from './header/HeaderAuth'
import { headerStyle } from './header/headerStyle'

import { getNormalizedKeywords, ValidAttributeKey } from '../lib/searchUtils'

// --- Configuration ---
const CONFIG = {
  logoText: 'ALETHEIA',
  placeholder: 'キーワードで検索..',
  loginLabel: 'ログイン',
  logoutLabel: 'ログアウト'
} as const

export const TopHeader: FC<{
  user?: any,
  areaName?: string,
  attrs?: ValidAttributeKey[], // 💡 将来的に受け取る配列の型を拡張
}> = ({ user, areaName, attrs }) => {
  const c = useRequestContext()
  
  /**
   * [Logic] Normalize keywords and area.
   */
  const qParams = c.req.query('q')  // キーワード(q)を取得(カンマ区切りの文字列)
  const keywords = getNormalizedKeywords(qParams)

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
        areaName={areaName} // 「エリア」で検索
        attrs={attrs}       // 「特徴」で検索
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