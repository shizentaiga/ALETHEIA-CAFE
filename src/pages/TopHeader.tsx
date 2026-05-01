/**
 * [File Path] src/pages/TopHeader.tsx
 * [Role] Header component with global search and authentication links.
 */
import type { FC } from 'hono/jsx'
import { useRequestContext } from 'hono/jsx-renderer'

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

  /* 入力欄全体を包む疑似的な入力ボックス */
  .header-search-input-wrapper {
    display: flex;
    align-items: center;
    flex-wrap: nowrap; /* チップが増えても1行を維持 */
    overflow-x: auto;   /* チップが多い場合は横スクロール */
    padding: 4px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    background: #f9fafb;
    transition: all 0.2s ease;
    scrollbar-width: none; /* Firefoxスクロールバー隠し */
  }
  .header-search-input-wrapper::-webkit-scrollbar { display: none; } /* Chrome隠し */

  .header-search-input-wrapper:focus-within {
    background: #fff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* 検索チップのスタイル */
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

  /* 実際の入力欄（枠を消して透明にする） */
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
  
  // Sync form state with current URL parameters
  const currentUrl = c.req.header('HX-Current-URL') || c.req.url
  const urlObj = new URL(currentUrl)
  const q = urlObj.searchParams.get('q') || ''
  const area = urlObj.searchParams.get('area') || ''

  // クエリをスペースで分割してチップ化（入力中の文字と分けるために、URLから取得したqを利用）
  const keywords = q.split(/[\s　]+/).filter(Boolean)

  return (
    <header class="header-container">
      <style>{headerStyle}</style>

      {/* 1. Brand Logo */}
      <a href="/" class="header-logo" style="text-decoration: none;">{CONFIG.logoText}</a>

      {/* 2. Search Form (Standard full-page reload) */}
      <form 
        class="header-search-form" 
        hx-get="/" 
        hx-target="#search-result-module" 
        hx-push-url="true"
        hx-select="#search-result-module"
      >
        <div class="header-search-input-wrapper">
          {/* キーワードがある場合にチップとして表示 */}
          {keywords.map(word => (
            <span class="search-chip">{word}</span>
          ))}

          <input 
            id="q-input-header"
            type="text" 
            name="q" 
            class="header-search-input" 
            placeholder={keywords.length > 0 ? "" : CONFIG.placeholder}
          />
          {/* Persist 'area' parameter during keyword search */}
          {area && <input type="hidden" name="area" value={area} />}
          
          <button type="submit" class="header-search-button" aria-label="Search">
            🔍
          </button>
        </div>
      </form>

      {/* 3. Authentication Links */}
      <div class="header-auth">
        {user ? (
          <span class="login-link">
            <a href="/logout" class="login-link">
              {CONFIG.logoutLabel} 
            </a>
          </span>
        ) : (
          <a href="/auth/google" class="login-link">{CONFIG.loginLabel}</a>
        )}
      </div>
    </header>
  )
}