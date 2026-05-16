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

  /* ロゴ：現状維持 */
  .header-logo {
    font-family: "Times New Roman", "Georgia", serif;
    font-size: 1.15rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: #111827;
    flex-shrink: 0;
    text-decoration: none;
  }

  /* 検索フォーム：メインコンテンツの最大幅と同期させて一体感を作る */
  .header-search-form {
    flex: 1;
    max-width: 800px; /* 👈 900px から 800px に調整し、下部コンテンツとの視線の縦ラインを整える */
  }

  /* 🔑 メイン：静かなワイド検索ボックス */
  .header-search-input-wrapper {
    display: flex;
    align-items: center;
    padding: 0 14px;
    height: 44px;
    border: 1px solid #e5e7eb;
    border-radius: 12px; /* 👈 999px から 12px に変更し、下部の新しいエリア・条件ボタンと角丸を統一 */
    background: #ffffff; /* 👈 現在の白ベースを維持 */
    transition: all 0.15s ease;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .header-search-input-wrapper::-webkit-scrollbar {
    display: none;
  }

  /* フォーカス時：現在の控えめな薄いトーンを維持 */
  .header-search-input-wrapper:focus-within {
    border-color: #d1d5db;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }

  /* チップ：丸みのあるカプセル型に調整 */
  .search-chip {
    display: inline-flex;
    align-items: center;
    background: #f2f4f7; /* 👈 少しだけ青み・柔らかさのある極薄グレー */
    color: #374151;
    padding: 4px 12px;   /* 👈 縦横の余白を少しだけ広げて、丸みをより美しく表現 */
    border-radius: 999px; /* 👈 6px から 999px に戻して完全な丸みに */
    margin-right: 6px;
    white-space: nowrap;
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 500;
  }

  /* 閉じるボタン（×）もカプセルの中に綺麗に収まる円形に */
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
    border-radius: 50%; /* 👈 綺麗な正円を維持 */
    transition: background 0.15s;
  }
  .search-chip-delete:hover {
    background: #e5e7eb;
    color: #374151;
  }

  /* ブラウザ独自の検索窓装飾をリセット */
  .header-search-input {
    flex: 1;
    min-width: 120px;
    border: none;
    background: transparent;
    font-size: 0.875rem;
    outline: none;
    color: #111827;
    -webkit-appearance: none;
    appearance: none;
  }

  .header-search-input-wrapper .header-search-input::-webkit-search-cancel-button,
  .header-search-input-wrapper .header-search-input::-webkit-search-decoration,
  .header-search-input-wrapper .header-search-input::-webkit-calendar-picker-indicator {
    display: none;
    -webkit-appearance: none;
  }

  .header-search-input::placeholder {
    color: #9ca3af; /* 👈 現在の柔らかい薄グレーを維持 */
  }

  /* 検索ボタン：現在の静かな存在感を維持 */
  .header-search-button {
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af; /* 👈 現在の薄いグレーを維持 */
    font-size: 1rem;
    padding-left: 8px;
    display: flex;
    align-items: center;
  }

  .header-search-button:hover {
    color: #6b7280;
  }

  /* 右側：ログイン（完全に脇役の薄いトーンを維持） */
  .header-auth {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    margin-left: auto;
  }

  .login-link {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280; /* 👈 現在の薄いグレーを維持 */
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
    .header-auth {
      margin-left: auto;
    }
  }
`