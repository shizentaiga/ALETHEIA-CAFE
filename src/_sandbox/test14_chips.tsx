import { Hono } from 'hono'
import { html } from 'hono/html'
import type { FC } from 'hono/jsx'

export const test14 = new Hono()

// --- 1. 汎用ロジック層 ---
type FilterAction = 
  | { type: 'set'; key: string; value: string; extra?: Record<string, string> }
  | { type: 'append'; key: string; value: string }
  | { type: 'delete'; key: string; extraKeys?: string[] }
  | { type: 'deleteValue'; key: string; value: string };

const createFilterPath = (baseUrl: string, currentParams: URLSearchParams, action: FilterAction) => {
  const p = new URLSearchParams(currentParams.toString());
  switch (action.type) {
    case 'set':
      p.set(action.key, action.value);
      if (action.extra) Object.entries(action.extra).forEach(([k, v]) => p.set(k, v));
      break;
    case 'append':
      if (!p.getAll(action.key).includes(action.value)) p.append(action.key, action.value);
      break;
    case 'delete':
      p.delete(action.key);
      if (action.extraKeys) action.extraKeys.forEach(k => p.delete(k));
      break;
    case 'deleteValue':
      const values = p.getAll(action.key).filter(v => v !== action.value);
      p.delete(action.key);
      values.forEach(v => p.append(action.key, v));
      break;
  }
  return `${baseUrl}?${p.toString()}`;
};

// --- 2. コンポーネント層 ---
const SearchChip: FC<{ label: string; href: string; isArea?: boolean; name: string; value: string }> = 
  ({ label, href, isArea, name, value }) => (
  <div class={`chip ${isArea ? 'area' : ''}`}>
    <span>{isArea ? `📍 ${label}` : label}</span>
    <a href={href} class="del">×</a>
    {/* フォーム送信時にこの値を維持する */}
    <input type="hidden" name={name} value={value} />
  </div>
);

// --- 3. メインハンドラ ---
test14.get('/', (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;
  const url = new URL(c.req.url);
  const currentParams = url.searchParams;

  const keywords = Array.from(new Set(currentParams.getAll('q'))).filter(v => v.trim() !== '');
  const area = currentParams.get('area');
  const areaName = currentParams.get('areaName');

  // 現在の全パラメータ（q以外）をhiddenで保持するためのリスト作成
  const otherParams: {key: string, value: string}[] = [];
  currentParams.forEach((value, key) => {
    if (key !== 'q') otherParams.push({ key, value });
  });

  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <title>Fixed Filter Sandbox</title>
      <script src="https://unpkg.com/htmx.org@1.9.10"></script>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; background: #f4f7f9; }
        .search-wrapper { max-width: 600px; margin: 0 auto; }
        .search-container { 
          display: flex; flex-wrap: wrap; align-items: center; gap: 8px; 
          padding: 10px; border: 2px solid #e2e8f0; border-radius: 14px; background: #fff;
        }
        .search-container:focus-within { border-color: #3b82f6; }
        .chip { 
          display: inline-flex; align-items: center; gap: 6px; 
          padding: 5px 12px; background: #edf2f7; border-radius: 20px; font-size: 0.9rem;
        }
        .chip.area { background: #ebf8ff; color: #2b6cb0; border: 1px solid #bee3f8; }
        .del { text-decoration: none; color: #a0aec0; font-weight: bold; }
        input[type="text"] { border: none; outline: none; flex: 1; min-width: 120px; padding: 6px; font-size: 1rem; }
        .controls { margin-top: 32px; padding: 20px; background: #fff; border-radius: 14px; border: 1px dotted #cbd5e1; }
        .btn { display: inline-block; padding: 8px 15px; border: 1px solid #e2e8f0; border-radius: 8px; text-decoration: none; color: #4a5568; margin-right: 5px; }
      </style>
    </head>
    <body hx-boost="true">
      <div class="search-wrapper">
        <form method="get" action="${baseUrl}" class="search-container">
          
          <!-- 1. エリアを表示しつつ hidden で値を維持 -->
          ${area && areaName ? html`${
            <SearchChip 
              label={areaName} 
              value={area} 
              name="area" 
              isArea 
              href={createFilterPath(baseUrl, currentParams, { type: 'delete', key: 'area', extraKeys: ['areaName'] })} 
            />
          }` : ''}
          <!-- areaNameも維持する必要がある -->
          ${areaName ? html`<input type="hidden" name="areaName" value="${areaName}">` : ''}

          <!-- 2. 既存のキーワードをチップとして表示しつつ hidden で維持 -->
          ${keywords.map(w => html`${
            <SearchChip 
              label={w} 
              value={w} 
              name="q" 
              href={createFilterPath(baseUrl, currentParams, { type: 'deleteValue', key: 'q', value: w })} 
            />
          }`)}

          <!-- 3. 新規入力用のテキストボックス -->
          <input type="text" name="q" placeholder="${keywords.length || area ? '' : '検索...'}" autofocus>

          <!-- 4. その他、URLに含まれるがチップ化されていない全パラメータを hidden で保持 -->
          ${otherParams.map(p => {
            // すでにチップ（area, areaName）として出したものは除外
            if (p.key === 'area' || p.key === 'areaName') return '';
            return html`<input type="hidden" name="${p.key}" value="${p.value}">`;
          })}
        </form>

        <div class="controls">
          <p><strong>エリアを選択（現在の条件を維持したまま上書き）:</strong></p>
          <a href="${createFilterPath(baseUrl, currentParams, { type: 'set', key: 'area', value: '13', extra: { areaName: '東京都' } })}" class="btn">📍 東京都</a>
          <a href="${createFilterPath(baseUrl, currentParams, { type: 'set', key: 'area', value: '14', extra: { areaName: '神奈川県' } })}" class="btn">📍 神奈川県</a>
          <a href="${baseUrl}" class="btn" style="color:red;">リセット</a>
        </div>
      </div>
    </body>
    </html>
  `)
})