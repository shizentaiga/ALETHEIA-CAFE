/**
 * [File Path] src/pages/header/styles.ts
 * [Role] Styles for the header components (Mercari-inspired wide search bar).
 */
export const headerStyle = `
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
    gap: 12px; /* 要素間のゆとりを確保 */
  }

  .header-logo {
    font-family: "Times New Roman", "Georgia", serif;
    font-size: 1.2rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    color: #1a1a1a;
    flex-shrink: 0;
    text-decoration: none;
  }

  .header-search-form {
    flex-grow: 1;
    /* 検索窓をメルカリのように広げる (最大800px) */
    max-width: 800px;
    margin: 0 4px;
  }

  /* Pseudo-input box that wraps chips and the actual input field */
  .header-search-input-wrapper {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding: 0 12px;
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    background: #f2f2f2; /* 少しグレーを強めて入力エリアを強調 */
    transition: all 0.2s ease;
    scrollbar-width: none;
    height: 40px; /* 高さを少し出してリッチに */
    box-sizing: border-box;
  }
    
  /* 2. 【追加】キーワード（チップ）が含まれている場合、背景を白にする */
  .header-search-input-wrapper:has(.search-chip) {
    background: #ffffff;
  }

  .header-search-input-wrapper::-webkit-scrollbar { display: none; }

  .header-search-input-wrapper:focus-within {
    background: #fff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* Styles for the keyword chips */
  .search-chip {
    display: inline-flex;
    align-items: center;
    background: #e5e7eb;
    color: #374151;
    padding: 2px 10px;
    border-radius: 14px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-right: 6px;
    white-space: nowrap;
    flex-shrink: 0;
    line-height: 1.5;
  }

  /* 削除ボタンを a タグ (フルリロード用) に最適化 */
  .search-chip-delete {
    text-decoration: none;
    color: #94a3b8;
    margin-left: 6px;
    font-size: 16px;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    transition: all 0.2s;
  }
  .search-chip-delete:hover {
    background-color: #cbd5e1;
    color: #1e293b;
  }

  /* Transparent input field within the wrapper */
  .header-search-input {
    flex-grow: 1;
    min-width: 100px;
    height: 100%;
    border: none;
    background: transparent;
    font-size: 0.95rem;
    outline: none;
    color: #1a1a1a;
  }

  .header-search-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    color: #64748b;
    padding-left: 8px;
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .header-auth { 
    flex-shrink: 0; 
    display: flex;
    gap: 8px;
  }

  .login-link {
    font-size: 0.8rem;
    font-weight: 600;
    color: #4b5563;
    text-decoration: none;
    padding: 8px 12px;
    border-radius: 6px;
    transition: background 0.2s;
  }
  .login-link:hover {
    background: #f3f4f6;
  }

  /* モバイル対応の調整 */
  @media (max-width: 640px) {
    .header-logo { font-size: 1.1rem; }
    .header-search-form { margin: 0; }
    .header-container { padding: 0 10px; }
  }

  @media (max-width: 480px) {
    .header-logo { display: none; } /* 極小画面ではロゴを隠して検索窓を優先 */
    .header-search-form { max-width: none; }
  }
`;