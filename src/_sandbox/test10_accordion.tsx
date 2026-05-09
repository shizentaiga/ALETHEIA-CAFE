import { Hono } from 'hono'
import { html } from 'hono/html'

export const test10 = new Hono()

test10.get('/', (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;

  return c.render(
    <>
      <style>{html`
        /* テスト用レイアウト調整 */
        .test-container {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 24px;
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }

        /* アコーディオン（details）の共通スタイル */
        details.filter-group {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          margin-bottom: 12px;
          overflow: hidden;
        }
        details.filter-group summary {
          list-style: none;
          cursor: pointer;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9fafb;
          user-select: none;
        }
        details.filter-group summary::-webkit-details-marker {
          display: none;
        }
        details.filter-group summary::after {
          content: '＋';
          font-size: 12px;
          color: #6b7280;
        }
        details[open].filter-group summary::after {
          content: '－';
        }
        .filter-content {
          padding: 12px 16px;
          border-top: 1px solid #e5e7eb;
        }

        /* 項目スタイル */
        .item {
          padding: 8px 0;
          font-size: 14px;
          color: #374151;
          border-bottom: 1px solid #f3f4f6;
        }
        .item:last-child { border: none; }

        /* モバイル対応：768px以下 */
        @media (max-width: 768px) {
          .test-container {
            grid-template-columns: 1fr;
            padding: 12px;
          }
          .sidebar {
            order: -1; /* 検索結果より上に表示 */
          }
        }
      `}</style>

      <header style="padding: 20px; border-bottom: 1px solid #eee;">
        <a href={baseUrl} style="text-decoration: none; color: inherit;">
          <h1 style="margin:0; font-size: 1.5rem; font-family: serif;">ALETHEIA Test Page</h1>
        </a>
        <p style="font-size: 0.8rem; color: #666;">PC: サイドバー / スマホ: 上部アコーディオン</p>
      </header>

      <div class="test-container">
        {/* サイドバー / スマホではトップ */}
        <aside class="sidebar">
          <details class="filter-group" open>
            <summary>エリア 📍</summary>
            <div class="filter-content">
              <div class="item">東京都 (312)</div>
              <div class="item">江戸川区 (22)</div>
              <div class="item">葛飾区 (15)</div>
            </div>
          </details>

          <details class="filter-group">
            <summary>特徴 ✨</summary>
            <div class="filter-content">
              <div class="item"><input type="checkbox" id="wifi" /> <label for="wifi">Wi-Fiあり</label></div>
              <div class="item"><input type="checkbox" id="power" /> <label for="power">電源あり</label></div>
              <div class="item"><input type="checkbox" id="smoke" /> <label for="smoke">完全禁煙</label></div>
            </div>
          </details>

          <details class="filter-group">
            <summary>カテゴリ ☕</summary>
            <div class="filter-content">
              <div class="item">カフェ</div>
              <div class="item">コワーキング</div>
              <div class="item">図書館</div>
            </div>
          </details>
        </aside>

        {/* メインコンテンツ */}
        <main class="results">
          <div style="padding: 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;">
            <h2 style="font-size: 1.1rem; margin-bottom: 8px;">テスト用検索結果</h2>
            <p style="color: #6b7280; font-size: 0.9rem;">
              左側（スマホでは上部）のアコーディオンを操作して、
              開閉のしやすさやレイアウトの崩れをチェックしてください。
            </p>
            <div style="margin-top: 20px; height: 400px; background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9ca3af;">
              Content Area
            </div>
          </div>
        </main>
      </div>
    </>
  )
})