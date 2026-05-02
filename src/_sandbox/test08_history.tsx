import { Hono } from 'hono'

export const test08 = new Hono()

// --- ① Script Definition (将来的に headerSearchScript.tsx へ切り出し可能) ---
const SEARCH_CONFIG = {
  STORAGE_KEY: 'aletheia_search_history',
  MAX_COUNT: 5,
  MAX_CHARS: 20
} as const

const clientScript = `
  (function() {
    const config = ${JSON.stringify(SEARCH_CONFIG)};

    window.saveKeyword = function() {
      const input = document.getElementById('keywordInput');
      let word = input.value.trim();
      if (!word) return;

      word = word.substring(0, config.MAX_CHARS);
      let history = JSON.parse(localStorage.getItem(config.STORAGE_KEY) || '[]');

      // FIFO: 重複を排除して先頭に追加し、最大件数で切り出し
      history = [word, ...history.filter(h => h !== word)].slice(0, config.MAX_COUNT);

      localStorage.setItem(config.STORAGE_KEY, JSON.stringify(history));
      window.renderHistory();
      console.log('Searching for:', word);
    };

    window.clearAllHistory = function() {
      if(confirm('検索履歴をすべて削除しますか？')) {
        localStorage.removeItem(config.STORAGE_KEY);
        window.renderHistory();
      }
    };

    window.renderHistory = function() {
      const datalist = document.getElementById('searchHistoryList');
      if (!datalist) return;
      const history = JSON.parse(localStorage.getItem(config.STORAGE_KEY) || '[]');
      
      datalist.innerHTML = history
        .map(word => '<option value="' + word + '">')
        .join('');
    };

    // 初期化実行
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', window.renderHistory);
    } else {
      window.renderHistory();
    }
  })();
`;

// --- ② HTML/CSS Components ---
test08.get('/', (c) => {
  return c.render(
    <section style="padding: 20px; max-width: 400px;">
      <style>{`
        .search-container { display: flex; gap: 8px; position: relative; }
        .search-input { flex: 1; padding: 10px; border-radius: 4px; border: 1px solid #ccc; }
        .search-btn { padding: 10px 20px; cursor: pointer; }
        .clear-btn { background: none; border: none; color: #999; cursor: pointer; font-size: 12px; }
      `}</style>

      <h3>キーワード検索（隠し履歴版）</h3>
      
      <div class="search-container">
        <input 
          type="text" 
          id="keywordInput" 
          list="searchHistoryList" 
          placeholder="キーワードを入力.." 
          class="search-input"
          autocomplete="off"
        />
        <button onclick="window.saveKeyword()" class="search-btn">検索</button>
        <button onclick="window.clearAllHistory()" class="clear-btn">履歴クリア</button>
      </div>

      {/* 履歴用データリスト */}
      <datalist id="searchHistoryList"></datalist>

      {/* スクリプト注入 */}
      <script dangerouslySetInnerHTML={{ __html: clientScript }} />
    </section>
  )
})