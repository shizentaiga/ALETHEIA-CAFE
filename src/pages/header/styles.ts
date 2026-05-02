export const headerStyle = `
  .header-container {
    display: flex;
    align-items: center;
    padding: 0 20px;
    height: 64px;
    border-bottom: 1px solid #e5e7eb;
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 50;
    gap: 16px;
  }

  /* ロゴ：現状維持＋少しだけ締める */
  .header-logo {
    font-family: "Times New Roman", "Georgia", serif;
    font-size: 1.15rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: #111827;
    flex-shrink: 0;
    text-decoration: none;
  }

  /* 検索フォーム：横幅をしっかり確保 */
  .header-search-form {
    flex: 1;
    max-width: 900px;
  }

  /* 🔑 メイン：静かなワイド検索ボックス */
  .header-search-input-wrapper {
    display: flex;
    align-items: center;
    padding: 0 14px;
    height: 44px;
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    background: #ffffff;
    transition: all 0.15s ease;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .header-search-input-wrapper::-webkit-scrollbar {
    display: none;
  }

  /* フォーカス時も控えめ */
  .header-search-input-wrapper:focus-within {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }

  /* チップ：目立たせすぎない */
  .search-chip {
    display: inline-flex;
    align-items: center;
    background: #f3f4f6;
    color: #374151;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-right: 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .search-chip-delete {
    text-decoration: none;
    color: #9ca3af;
    margin-left: 6px;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    transition: background 0.15s;
  }

  .search-chip-delete:hover {
    background: #e5e7eb;
    color: #374151;
  }

  /* 入力欄：主役だが静か */
  .header-search-input {
    flex: 1;
    min-width: 120px;
    border: none;
    background: transparent;
    font-size: 0.95rem;
    outline: none;
    color: #111827;
  }

  .header-search-input::placeholder {
    color: #9ca3af;
  }

  /* 検索ボタン：存在感を消す */
  .header-search-button {
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    font-size: 1rem;
    padding-left: 8px;
    display: flex;
    align-items: center;
  }

  .header-search-button:hover {
    color: #6b7280;
  }

  /* 右側：ログインは完全に脇役 */
  .header-auth {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    margin-left: auto;
  }

  .login-link {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    text-decoration: none;
    padding: 6px 4px;
    transition: color 0.15s;
  }

  .login-link:hover {
    color: #111827;
  }

  /* モバイル */
  @media (max-width: 640px) {
    .header-container {
      padding: 0 12px;
      gap: 10px;
    }
    .header-logo {
      font-size: 1rem;
    }
  }

  @media (max-width: 480px) {
    .header-logo {
      display: none;
    }
    /* モバイルでも右端を維持 */
    .header-auth {
      margin-left: auto;
    }
  }
`