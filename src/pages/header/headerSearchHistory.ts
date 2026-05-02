import { SEARCH_HISTORY_CONFIG } from '../../lib/constants';

/**
 * [ALETHEIA PROJECT] Header Search History Logic
 * 
 * 1. 20文字制限 / 最大5件 / FIFO・LRU管理
 * 2. HTMX (afterSwap, historyRestore) 完全対応
 * 3. 履歴がある時だけ「履歴削除」リンクを表示するUI制御
 */
export const headerSearchHistory = `
  (function() {
    const config = ${JSON.stringify(SEARCH_HISTORY_CONFIG)};
    const INPUT_ID = 'q-input-header';
    const LIST_ID = 'searchHistoryList';

    // --- 1. 描画ロジック ---
    window.renderHistory = function() {
      const datalist = document.getElementById(LIST_ID);
      if (!datalist) return;

      const history = JSON.parse(localStorage.getItem(config.KEY) || '[]');
      
      // datalistの更新
      datalist.innerHTML = history
        .map(word => '<option value="' + word + '">')
        .join('');

    };

    // --- 2. 保存ロジック ---
    window.saveKeyword = function() {
      const input = document.getElementById(INPUT_ID);
      if (!input) return;

      let word = input.value.trim();
      if (!word) return;

      // 20文字制限
      word = word.substring(0, config.MAX_CHARS);

      let history = JSON.parse(localStorage.getItem(config.KEY) || '[]');

      // 重複排除して先頭へ (LRU) + 最大5件制限
      history = [word, ...history.filter(h => h !== word)].slice(0, config.MAX_COUNT);

      localStorage.setItem(config.KEY, JSON.stringify(history));
      window.renderHistory();
    };

    // --- 4. ライフサイクル管理 (HTMX対応) ---
    function init() {
      window.renderHistory();
    }

    // 初回読み込み
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    // HTMX: ページ遷移(Swap)後、および「戻る」ボタン(Restore)対応
    document.body.addEventListener('htmx:afterSwap', init);
    document.body.addEventListener('htmx:historyRestore', init);
  })();
`;