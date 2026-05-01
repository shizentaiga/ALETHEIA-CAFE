/**
 * [File Path] src/pages/TopHeader.tsx
 * [Role] Header component with global search and authentication links.
 */
import type { FC } from 'hono/jsx'
import { useRequestContext } from 'hono/jsx-renderer'
import { HeaderSearch } from './header/HeaderSearch'
import { HeaderAuth } from './header/HeaderAuth'

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
const headerStyle = `
  .header-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    height: 60px;
    border-bottom: 1px solid #f1f1f1;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .header-logo {
    font-family: "Times New Roman", "Georgia", serif;
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    color: #1a1a1a;
    flex-shrink: 0;
    margin-right: 12px;
  }
  .header-search-form {
    flex-grow: 1;
    max-width: 480px;
    margin: 0 12px;
  }

  /* Pseudo-input box that wraps chips and the actual input field */
  .header-search-input-wrapper {
    display: flex;
    align-items: center;
    flex-wrap: nowrap; /* Maintain a single line even as chips increase */
    overflow-x: auto;  /* Allow horizontal scrolling for many chips */
    padding: 4px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    background: #f9fafb;
    transition: all 0.2s ease;
    scrollbar-width: none; /* Hide scrollbar for Firefox */
  }
  .header-search-input-wrapper::-webkit-scrollbar { display: none; } /* Hide scrollbar for Chrome/Safari */

  .header-search-input-wrapper:focus-within {
    background: #fff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Styles for the keyword chips */
  .search-chip {
    display: flex;
    align-items: center;
    background: #eee;
    color: #333;
    padding: 2px 10px;
    border-radius: 14px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-right: 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .search-chip-delete {
    margin-left: 6px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    transition: background-color 0.2s;
    font-size: 12px;
    line-height: 1;
    color: #94a3b8;
  }
  .search-chip-delete:hover {
    background-color: #cbd5e1;
    color: #1e293b;
  }

  /* Transparent input field within the wrapper */
  .header-search-input {
    flex-grow: 1;
    min-width: 80px;
    height: 30px;
    border: none;
    background: transparent;
    font-size: 0.9rem;
    outline: none;
  }

  .header-search-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: #64748b;
    padding: 0 4px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  
  .header-auth { flex-shrink: 0; }
  .login-link {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-decoration: none;
    padding: 8px 4px;
    letter-spacing: 0.05em;
  }

  @media (max-width: 480px) {
    .header-logo { font-size: 1rem; }
    .header-container { padding: 0 8px; }
  }
`

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