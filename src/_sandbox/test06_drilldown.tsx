import { Hono } from 'hono'
import { html } from 'hono/html'

export const test06 = new Hono()

// --- 1. 本番と同じデザイン設定 ---
const DESIGN = {
  width: '100%', // サンドボックス表示用に調整
  borderRadius: '12px',
  colors: {
    border: '#e5e7eb',
    text: '#64748b',
    textSecondary: '#94a3b8',
    background: '#fff',
    hoverBg: '#f9fafb',
    headerBg: '#f9fafb',
    accent: '#0070f3'
  }
} as const

// --- 2. 擬似データ ---
const MOCK_DATA = {
  regions: [{ id: 'reg-1', name: '関東' }, { id: 'reg-2', name: '関西' }],
  prefectures: {
    'reg-1': [{ id: 'pref-13', name: '東京都' }, { id: 'pref-14', name: '神奈川県' }],
    'reg-2': [{ id: 'pref-27', name: '大阪府' }]
  },
  cities: {
    'pref-13': [{ id: 'city-1', name: '新宿区' }, { id: 'city-2', name: '江戸川区' }],
    'pref-14': [{ id: 'city-3', name: '横浜市' }]
  }
}

// --- 3. 共通スタイル（SearchArea.tsxのCSSを適用） ---
const sharedStyles = html`
<style>
  .area-list-container {
    width: 100%; background: ${DESIGN.colors.background};

    overflow: hidden; border: 1px solid ${DESIGN.colors.border};
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }
  .area-header-ui {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid #f3f4f6;
    font-size: 0.85rem; font-weight: 600; color: #111827; background: ${DESIGN.colors.headerBg};
  }
  .area-list-scroll { max-height: 300px; overflow-y: auto; }
  .area-item-ui {
    width: 100%; padding: 12px 16px; border: none; background: #fff;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 0.9rem; color: ${DESIGN.colors.text}; cursor: pointer;
    border-bottom: 1px solid #f9fafb; transition: background 0.2s;
  }
  .area-item-ui:hover { background: ${DESIGN.colors.hoverBg}; color: ${DESIGN.colors.accent}; }
  .back-icon { cursor: pointer; padding-right: 8px; color: #9ca3af; font-size: 1.1rem; }
  .status-info { margin-top: 20px; padding: 12px; font-size: 0.8rem; color: #64748b; border-left: 4px solid ${DESIGN.colors.accent}; background: #f0f7ff; }
</style>
`;

// --- メイン画面 ---
test06.get('/', (c) => {
  const baseUrl = c.req.path.replace(/\/$/, '');
  return c.render(
    <>
      {sharedStyles}
      <div style="max-width: 400px; margin: 40px auto;">
        <header style="margin-bottom: 24px;">
          <h2 style="font-size: 1.25rem; font-weight: 700;">エリア絞り込み検証</h2>
          <p style="font-size: 0.85rem; color: #64748b;">3層API分離・シームレスUX</p>
        </header>

        {/* 本番のSearchArea.tsxが生成するIDと一致させる */}
        <div id="area-drilldown-root" hx-get={`${baseUrl}/regions`} hx-trigger="load">
        </div>

        <div id="search-results-preview" class="status-info">
          現在の絞り込み: <b>未選択</b>
        </div>
      </div>
    </>
  )
})

// --- API 1: 大エリア ---
test06.get('/regions', (c) => {
  const baseUrl = c.req.path.replace(/\/regions$/, '');
  return c.html(html`
    <div class="area-list-container">
      <div class="area-header-ui">
        <div>エリアを選択</div>
        <span style="cursor:pointer; color:#9ca3af;" onclick="location.reload()">×</span>
      </div>
      <div class="area-list-scroll">
        ${MOCK_DATA.regions.map(r => html`
          <button class="area-item-ui" 
                  hx-get="${baseUrl}/prefectures?region_id=${r.id}&region_name=${r.name}" 
                  hx-target="#area-drilldown-root">
            <span>${r.name}</span>
            <span style="font-size: 0.7rem; color: #d1d5db;">❯</span>
          </button>
        `)}
      </div>
    </div>
  `)
})

// --- API 2: 中エリア ---
test06.get('/prefectures', (c) => {
  const baseUrl = c.req.path.replace(/\/prefectures$/, '');
  const regionId = c.req.query('region_id') as keyof typeof MOCK_DATA.prefectures;
  const regionName = c.req.query('region_name');
  const prefs = MOCK_DATA.prefectures[regionId] || [];

  return c.html(html`
    <div class="area-list-container">
      <div class="area-header-ui">
        <div>
          <span class="back-icon" hx-get="${baseUrl}/regions" hx-target="#area-drilldown-root">←</span>
          ${regionName}
        </div>
        <span style="cursor:pointer; color:#9ca3af;" onclick="location.reload()">×</span>
      </div>
      <div class="area-list-scroll">
        ${prefs.map(p => html`
          <button class="area-item-ui" 
                  hx-get="${baseUrl}/cities?pref_id=${p.id}&pref_name=${p.name}&region_name=${regionName}" 
                  hx-target="#area-drilldown-root">
            <span>${p.name}</span>
            <span style="font-size: 0.7rem; color: #d1d5db;">❯</span>
          </button>
        `)}
      </div>

      <div id="search-results-preview" hx-swap-oob="true" class="status-info">
        現在の絞り込み: <b>${regionName} 全体</b>
      </div>
    </div>
  `)
})

// --- API 3: 小エリア ---
test06.get('/cities', (c) => {
  const baseUrl = c.req.path.replace(/\/cities$/, '');
  const prefId = c.req.query('pref_id') as keyof typeof MOCK_DATA.cities;
  const prefName = c.req.query('pref_name');
  const regionName = c.req.query('region_name');
  const cities = MOCK_DATA.cities[prefId] || [];

  return c.html(html`
    <div class="area-list-container">
      <div class="area-header-ui">
        <div>
          <span class="back-icon" hx-get="${baseUrl}/prefectures?region_id=reg-1&region_name=${regionName}" hx-target="#area-drilldown-root">←</span>
          ${prefName}
        </div>
        <span style="cursor:pointer; color:#9ca3af;" onclick="location.reload()">×</span>
      </div>
      <div class="area-list-scroll">
        ${cities.map(city => html`
          <button class="area-item-ui" 
                  onclick="alert('${city.name}で検索を実行します'); location.reload();">
            <span>${city.name}</span>
          </button>
        `)}
      </div>
      <div id="search-results-preview" hx-swap-oob="true" class="status-info">
        現在の絞り込み: <b>${prefName} 全体</b>
      </div>
    </div>
  `)
})