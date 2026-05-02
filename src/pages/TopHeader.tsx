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
  
  /**
   * [Fix] Use c.req.queries() to get multiple 'q' parameters as an array.
   * This ensures /?q=word1&q=word2 correctly returns ['word1', 'word2'].
   */
  const qParams = c.req.queries('q') || []
  const area = c.req.query('area') || ''

  /**
   * If keywords exist, they are already an array. 
   * If someone typed "word1 word2" in a single input, we split them just in case.
   */
  const keywords = qParams
    .flatMap(q => q.split(/[\s　]+/))
    .filter(Boolean)

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