/**
 * [File Path] public/search-ui.js
 * 検索窓のチップ化と同期を専門に扱うロジック
 */

window.initSearchUI = () => {
  // HTMX の afterSettle イベント（コンテンツが入れ替わった後）にフック
  document.body.addEventListener('htmx:afterSettle', (evt) => {
    // search-result-module が更新された時だけ実行
    if (evt.detail.target.id !== 'search-result-module') return;

    const resModule = evt.detail.target;
    // サーバーから渡された最新の状態を hidden input 等から取得
    const q = resModule.querySelector('#current-q-state')?.value || "";
    const area = resModule.querySelector('#current-area-state')?.value || "";
    
    syncSearchChips(q, area);
  });
};

function syncSearchChips(q, area) {
  const searchInput = document.getElementById('q-input-header');
  if (!searchInput) return;

  const wrapper = searchInput.parentElement;
  const currentKeywords = q.split(/[\s　]+/).filter(Boolean);

  // 1. 既存チップのクリア
  wrapper.querySelectorAll('.search-chip').forEach(chip => chip.remove());

  // 2. チップの動的生成
  currentKeywords.forEach(word => {
    const span = document.createElement('span');
    span.className = 'search-chip';
    span.innerText = word;

    const delBtn = document.createElement('span');
    delBtn.className = 'search-chip-delete';
    delBtn.innerText = '×';

    // 削除後のクエリ構築
    const newQuery = currentKeywords.filter(k => k !== word).join(' ');
    let searchPath = `/?q=${encodeURIComponent(newQuery)}`;
    if (area) searchPath += `&area=${encodeURIComponent(area)}`;

    // HTMX 属性のセット
    delBtn.setAttribute('hx-get', searchPath);
    delBtn.setAttribute('hx-target', '#search-result-module');
    delBtn.setAttribute('hx-push-url', 'true');
    delBtn.setAttribute('hx-select', '#search-result-module');

    span.appendChild(delBtn);
    wrapper.insertBefore(span, searchInput);
  });

  // 3. 入力欄の状態リセット
  searchInput.value = "";
  searchInput.placeholder = currentKeywords.length > 0 ? "" : "キーワードで検索..";

  // 4. HTMX に新しい要素を認識させる
  if (window.htmx) {
    htmx.process(wrapper);
  }
}

// 初回読み込み用
window.initSearchUI();