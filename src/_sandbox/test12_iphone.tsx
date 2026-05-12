// src/_sandbox/test12_iphone.tsx
import { Hono } from 'hono'

export const test12 = new Hono()

test12.get('/', (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;
  const allQueries = c.req.queries('q') || [];

  // 本番同様の保存＋描画ロジックをJS文字列化
  const crashLogic = `
    const input = this.querySelector('input[name="q"]');
    if (input && input.value.trim()) {
      // 1. LocalStorage保存 (低負荷)
      const word = input.value.trim();
      const history = JSON.parse(localStorage.getItem('search_history') || '[]');
      const newHistory = [word, ...history.filter(h => h !== word)].slice(0, 5);
      localStorage.setItem('search_history', JSON.stringify(newHistory));

      // 2. DOM書き換え (これがiPhoneでSubmitを阻害する疑いあり)
      const list = document.getElementById('searchHistoryList');
      if (list) {
        list.innerHTML = newHistory.map(w => '<option value="' + w + '">').join('');
      }
    }
    // 名前の書き換え
    this.querySelectorAll('.js-q').forEach(el => el.name = 'q');
  `;

  return c.render(
    <>
      <header><a href={baseUrl}><h1>IPHONE CRASH TEST</h1></a></header>
      
      <form 
        action={baseUrl} 
        method="get" 
        style="margin-top: 20px;"
        onsubmit={crashLogic}
      >
        <input type="hidden" name="q-hidden" value="apple" class="js-q" />

        <div style="background: #eee; padding: 10px; border-radius: 8px;">
          <input 
            type="search" 
            name="q" 
            list="searchHistoryList"
            placeholder="ここでEnterが効くかテスト" 
            enterkeyhint="search"
            style="width: 100%; border: none; background: transparent; font-size: 16px;"
          />
        </div>
        
        <datalist id="searchHistoryList"></datalist>
        <button type="submit" style="margin-top: 10px;">検索実行</button>
      </form>

      <div style="margin-top: 20px;">
        <p>受信結果: {JSON.stringify(allQueries)}</p>
      </div>
    </>
  )
})