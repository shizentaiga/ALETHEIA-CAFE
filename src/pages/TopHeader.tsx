/**
 * [File Path] src/pages/TopHeader.tsx
 * [Role] Header component with global search and authentication links.
 */
import type { FC } from 'hono/jsx'
import { useRequestContext } from 'hono/jsx-renderer'
import { HeaderSearch } from './header/HeaderSearch'
import { HeaderAuth } from './header/HeaderAuth'
import { headerStyle } from './header/styles'

// --- Configuration ---
const CONFIG = {
  logoText: 'ALETHEIA',
  placeholder: 'キーワードで検索..',
  loginLabel: 'ログイン',
  logoutLabel: 'ログアウト'
} as const

/**
 * [Styles] 
 * Defines layout and responsive behavior for the header.
 */

export const TopHeader: FC<{ user?: any }> = ({ user }) => {
  const c = useRequestContext()
  
  // Sync form state with current URL parameters for both standard and HTMX requests
  const currentUrl = c.req.header('HX-Current-URL') || c.req.url
  const urlObj = new URL(currentUrl)
  const q = urlObj.searchParams.get('q') || ''
  const area = urlObj.searchParams.get('area') || ''

  // Split query into individual keywords to render as interactive chips
  const keywords = q.split(/[\s　]+/).filter(Boolean)

  return (
    <header class="header-container">
      <style>{headerStyle}</style>

      {/* 1. Brand Logo */}
      <a href="/" class="header-logo" style="text-decoration: none;">{CONFIG.logoText}</a>

      {/* 2. Search Form (Extracted to component) */}
      <HeaderSearch 
        keywords={keywords} 
        placeholder={CONFIG.placeholder} 
        area={area} 
      />

      {/* 3. Authentication Links (Extracted to component) */}
      <HeaderAuth 
        user={user} 
        loginLabel={CONFIG.loginLabel} 
        logoutLabel={CONFIG.logoutLabel} 
      />
    </header>
  )
}