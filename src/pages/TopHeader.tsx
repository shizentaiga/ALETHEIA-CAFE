import type { FC } from 'hono/jsx'

// --- Configuration (Labels and Settings) ---
const CONFIG = {
  logoText: 'ALETHEIA',
  placeholder: 'キーワードで検索..',
  loginLabel: 'ログイン',
  logoutLabel: 'ログアウト'
} as const

/**
 * [Design Settings]
 * For Designers: Typography and layout adjustments.
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
  /* Logo: Serif font for a smart and clean look */
  .header-logo {
    font-family: "Times New Roman", "Georgia", serif;
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    color: #1a1a1a;
    flex-shrink: 0;
    margin-right: 12px;
  }
  /* Search Form: Takes up the center space */
  .header-search-form {
    flex-grow: 1;
    max-width: 480px; /* Prevents it from getting too wide */
    margin: 0 12px;
    position: relative;
  }
  .header-search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .header-search-input {
    width: 100%;
    height: 38px;
    padding: 0 40px 0 16px; /* Space for the search icon on the right */
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    background: #f9fafb;
    font-size: 0.9rem;
    outline: none;
    transition: all 0.2s ease;
  }
  .header-search-input:focus {
    background: #fff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .header-search-button {
    position: absolute;
    right: 12px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: #64748b;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  /* Auth Link: Small and simple to reduce visual noise */
  .header-auth {
    flex-shrink: 0;
  }
  .login-link {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    text-decoration: none;
    padding: 8px 4px;
    letter-spacing: 0.05em;
    transition: color 0.2s;
  }
  .login-link:hover {
    color: #1e293b;
  }

  /* Mobile: Make text smaller if space is tight */
  @media (max-width: 480px) {
    .header-logo { font-size: 1rem; letter-spacing: 0.05em; }
    .header-container { padding: 0 12px; }
  }
`

// Receive user data via props
export const TopHeader: FC<{ user?: any }> = ({ user }) => {
  return (
    <header class="header-container">
      <style>{headerStyle}</style>

      {/* 1. Left: Logo (Goes to top page on click) */}
      <a href="/" class="header-logo" style="text-decoration: none;">{CONFIG.logoText}</a>

      {/* 2. Center: Search Form (Uses HTMX to update results) */}
      <form 
        class="header-search-form" 
        action="/" 
        method="get"
        hx-get="/" 
        hx-target="#search-result-module" // Update only the result section
        hx-include="#current-area-state" // Include the selected area in the request
        hx-push-url="true"
      >
        <div class="header-search-input-wrapper">
          {/* Added ID to the keyword input for HTMX reference */}
          <input 
            id="q-input-header"
            type="text" 
            name="q" 
            class="header-search-input" 
            placeholder={CONFIG.placeholder}
          />
          <button type="submit" class="header-search-button" aria-label="Search">
            🔍
          </button>
        </div>
      </form>

      {/* 3. Right: Simple Login/Logout Link */}
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