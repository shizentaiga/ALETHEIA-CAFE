// src/pages/header/headerSearchHistory.ts

/**
 * [ALETHEIA PROJECT] ヘッダー検索履歴ロジック
 * 
 * 1. 仕様: 20文字制限 / 最大5件 / 重複時は先頭へ移動 (LRU形式)
 * 2. iPhone対策: ページ読み込み時のDOM操作を避け、Enterキーの動作を保証
 * 3. HTMX対応: ページ遷移や履歴復元後も、新しい要素に対して正しく動作を適用
 */

/**
 * 検索履歴設定 (PWA用ローカルストレージ)
 * 最大10件、1件50文字以内のキーワードをFIFO形式で管理
 */
export const SEARCH_HISTORY_CONFIG = {
  KEY: 'aletheia_search_history',
  MAX_COUNT: 10,
  MAX_CHARS: 50,
} as const;

export const headerSearchHistory = `
  (function() {
    // サーバーサイドの設定値を展開
    const config = ${JSON.stringify(SEARCH_HISTORY_CONFIG)};
    const INPUT_ID = 'q-input-header';
    const LIST_ID = 'searchHistoryList';

    // --- 1. 描画ロジック ---
    // ローカルストレージから履歴を取得し、datalistの中身（option）を更新する
    window.renderHistory = function() {
      const datalist = document.getElementById(LIST_ID);
      if (!datalist) return;

      const history = JSON.parse(localStorage.getItem(config.KEY) || '[]');
      
      // optionタグの生成と反映
      datalist.innerHTML = history
        .map(word => '<option value="' + word + '">')
        .join('');
    };

    // --- 2. 保存ロジック ---
    // 検索実行時に呼び出され、キーワードをローカルストレージに保存する
    window.saveKeyword = function() {
      const input = document.getElementById(INPUT_ID);
      if (!input) return;

      let word = input.value.trim();
      if (!word) return;

      // 文字数制限の適用
      word = word.substring(0, config.MAX_CHARS);

      let history = JSON.parse(localStorage.getItem(config.KEY) || '[]');

      // 重複排除して先頭へ追加し、最大保存件数で切り出し
      history = [word, ...history.filter(h => h !== word)].slice(0, config.MAX_COUNT);

      localStorage.setItem(config.KEY, JSON.stringify(history));
      
      // リストを最新の状態に更新
      window.renderHistory();
    };

    // --- 3. ライフサイクル管理 (HTMX対応) ---
    function init() {
      const input = document.getElementById(INPUT_ID);
      if (input) {
        /**
         * 重要(iPhone対策):
         * ページロード直後のDOM操作はiPhone ChromeでのEnterキー送信を阻害する場合があるため、
         * ユーザーが入力欄にフォーカスしたタイミングで初めて描画（renderHistory）を実行する。
         */
        input.addEventListener('focus', () => window.renderHistory(), { once: true });
      }
    }

    // ページの初回読み込み時の処理
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    // HTMX: ページの内容が差し替わった際（afterSwap）や戻るボタン（historyRestore）時に再初期化
    document.body.addEventListener('htmx:afterSwap', init);
    document.body.addEventListener('htmx:historyRestore', init);
  })();
`;