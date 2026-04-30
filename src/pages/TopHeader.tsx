import type { FC } from 'hono/jsx'

// --- Configuration (文言・データ設定) ---
const CONFIG = {
  logoText: 'ALETHEIA',
  placeholder: 'キーワードで検索...',
  loginLabel: 'ログイン',
  logoutLabel: 'ログアウト'
} as const

/**
 * 【Design Settings】
 * デザイナー向け：タイポグラフィと中央配置の調整。
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
  /* ロゴ：セリフ体で知的な印象 */
  .header-logo {
    font-family: "Times New Roman", "Georgia", serif;
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    color: #1a1a1a;
    flex-shrink: 0;
    margin-right: 12px;
  }
  /* 検索窓：中央を広く占有 */
  .header-search-form {
    flex-grow: 1;
    max-width: 480px; /* 伸びすぎ防止 */
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
    padding: 0 40px 0 16px; /* 右側にボタン用の余白を確保 */
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
  /* ログイン：極小・枠なしでノイズを消す */
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

  /* モバイル対応：ロゴが邪魔な場合は文字を小さく */
  @media (max-width: 480px) {
    .header-logo { font-size: 1rem; letter-spacing: 0.05em; }
    .header-container { padding: 0 12px; }
  }
`

// props に user を追加
export const TopHeader: FC<{ user?: any }> = ({ user }) => {
  return (
    <header class="header-container">
      <style>{headerStyle}</style>

      {/* 1. 左：ロゴ(クリック時にトップページへ遷移) */}
      <a href="/" class="header-logo" style="text-decoration: none;">{CONFIG.logoText}</a>

      {/* 2. 中央：検索窓（URL集約型 / Enterまたは🔍クリックで実行） */}
      <form 
        class="header-search-form" 
        action="/" 
        method="get"
        hx-get="/" 
        hx-target="#search-result-module" // ★ここを修正（SearchResultの最外周ID）
        hx-include="#current-area-state" // 💡 ステップ1で作ったバケツを拾う
        hx-push-url="true"
      >
        <div class="header-search-input-wrapper">
          {/* キーワード入力 input に id を付与 */}
          <input 
            id="q-input-header"
            type="text" 
            name="q" 
            class="header-search-input" 
            placeholder={CONFIG.placeholder}
          />
          <button type="submit" class="header-search-button" aria-label="検索">
            🔍
          </button>
        </div>
      </form>

      {/* 3. 右：最小限のログイン文字 */}
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