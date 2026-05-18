// src/_sandbox/test16_scroll.tsx
import { Hono } from 'hono'

export const test16 = new Hono()

const MOCK_UNIQUE_FEATURES = [
  { key: 'p1', label: '✨ 24時間利用可能' },
  { key: 'p2', label: '✨ 完全個室' },
  { key: 'p3', label: '✨ 駅チカ（徒歩3分以内）' },
] as const;

const MOCK_INFRA_FEATURES = [
  { key: 'f1', label: '📶 Wi-Fi完備' },
  { key: 'f2', label: '🔌 電源あり' },
  { key: 'f3', label: '🖨️ プリンター・複合機' },
  { key: 'f4', label: '☕ フリードリンク' },
  { key: 'f5', label: '冷凍冷蔵庫' },
  { key: 'f6', label: 'ロッカーあり' },
  { key: 'f7', label: 'プロジェクター利用可' },
  { key: 'f8', label: '専用駐輪場' },
] as const;

test16.get('/', (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;
  
  // クエリパース処理
  const rawQuery = c.req.query('attrs') || '';
  const selectedAttrs = rawQuery ? rawQuery.split(',').filter(Boolean) : [];
  const isOpen = c.req.query('open_attrs') === '1';

  // モーダルを開く・閉じるためのURL
  const openUrl = `${baseUrl}?open_attrs=1${selectedAttrs.length > 0 ? `&attrs=${selectedAttrs.join(',')}` : ''}`;
  const closeUrl = `${baseUrl}${selectedAttrs.length > 0 ? `?attrs=${selectedAttrs.join(',')}` : ''}`;

  // HTMXからの通信かどうかをヘッダーで判定
  const isHtmx = c.req.header('HX-Request') === 'true';

  // 💡 コンポーネント部分のみを共通化して、二重描画を徹底防止
  const searchModuleContent = (
    <div id="attribute-search-root" style={{ width: '100%', maxWidth: '400px', margin: '20px 0' }}>
      {!isOpen && (
        <button 
          hx-get={openUrl} 
          hx-target="#attribute-search-root"
          style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e5e7eb', background: '#fff', textAlign: 'left', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div>⚙ 特徴で探す</div>
          <span style={{ color: '#94a3b8' }}>▼</span>
        </button>
      )}

      {isOpen && (
        <div class="attribute-modal-container" style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
          <style>{`
            .attr-header-ui { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 0.85rem; font-weight: 600; background: #fbfbfc; }
            .attr-list-scroll { max-height: 180px; overflow-y: auto; padding: 8px 0; }
            .attr-section-title { font-size: 0.72rem; font-weight: 600; color: #64748b; padding: 10px 16px 6px; letter-spacing: 0.02em; }
            .attr-item-ui { width: 100%; padding: 10px 16px; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; color: #4b5563; cursor: pointer; border-bottom: 1px solid #f9fafb; text-align: left; background: #fff; box-sizing: border-box; }
            .attr-item-ui:hover { background: #fafbfc; }
            .attr-item-ui:has(.attr-checkbox:checked) { background: #f8fafc; color: #111827; font-weight: 500; }
            .attr-checkbox { width: 17px; height: 17px; cursor: pointer; }
            .attr-footer-ui { padding: 14px 16px; border-top: 1px solid #f3f4f6; background: #fcfcfd; }
          `}</style>

          <div class="attr-header-ui">
            <div>特徴·設備で絞り込む</div>
            <span style={{ cursor: 'pointer', color: '#9ca3af' }} hx-get={closeUrl} hx-target="#attribute-search-root">×</span>
          </div>

          <form action={baseUrl} method="get">
            <div class="attr-list-scroll">
              <div class="attr-section-title">✨ 注目の特徴</div>
              {MOCK_UNIQUE_FEATURES.map(item => {
                const isChecked = selectedAttrs.includes(item.key);
                return (
                  <label class="attr-item-ui">
                    <input 
                      type="checkbox" 
                      name="attrs" 
                      value={item.key} 
                      class="attr-checkbox" 
                      checked={isChecked} 
                    />
                    <span>{item.label}</span>
                  </label>
                )
              })}

              <div class="attr-section-title"> 設備・サービス</div>
              {MOCK_INFRA_FEATURES.map(item => {
                const isChecked = selectedAttrs.includes(item.key);
                return (
                  <label class="attr-item-ui">
                    <input 
                      type="checkbox" 
                      name="attrs" 
                      value={item.key} 
                      class="attr-checkbox" 
                      checked={isChecked} 
                    />
                    <span>{item.label}</span>
                  </label>
                )
              })}
            </div>

            <div class="attr-footer-ui">
              <button type="submit" style={{ width: '100%', padding: '10px', background: '#334155', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                この条件で検索する
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );

  // 💡 HTMXからの部分リクエストであれば、ヘッダー等のレイアウトを適用せずHTMLパーツだけを返す
  if (isHtmx) {
    return c.html(searchModuleContent);
  }

  // 初回アクセス（ブラウザでの直接リロードなど）時は、全体レイアウトを適用する
  return c.render(
    <>
      <header><a href={baseUrl}><h1>ALETHEIA</h1></a></header>
      <p>タイトルをクリックするとトップに移動します。</p>
      {searchModuleContent}
    </>
  )
})