import { Hono } from 'hono'

// ==========================================
// 1. 定数・設定値の宣言（外部ファイル化が容易な構成）
// ==========================================
const CONFIG = {
  TITLE: 'エリア選択サンドボックス (v2.3)',
  API_BASE_URL: 'https://geoapi.heartrails.com/api/json',
  ENDPOINTS: {
    CITIES: 'cities',
    PREVIEW: 'preview',
  },
  STYLES: {
    CONTAINER_WIDTH: '600px',
    ACCENT_COLOR: '#007bff',
    BG_DARK: '#222',
    SQL_COLOR: '#0f0',
  }
}

const LABELS = {
  PREF_LABEL: '1. 都道府県を選択',
  CITY_LABEL: '2. 市区町村を選択',
  LOADING: '⏳ データを取得中...',
  SQL_HEADER: '💾 生成される SQL イメージ:',
  DEFAULT_OPTION: '選択してください',
}

// ==========================================
// 2. メインロジック
// ==========================================
export const test09 = new Hono()

/**
 * メイン画面：URLパラメータ (?pref=xxx&city=yyy) に応じて初期状態を決定
 */
test09.get('/', async (c) => {
  const selectedPref = c.req.query('pref') || ''
  const selectedCity = c.req.query('city') || ''
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`

  return c.render(
    <div style={`max-width: ${CONFIG.STYLES.CONTAINER_WIDTH}; margin: 20px auto; font-family: sans-serif;`}>
      <h3>{CONFIG.TITLE}</h3>
      
      <div style="border: 2px solid #333; padding: 20px; border-radius: 8px;">
        
        {/* 都道府県：変更時にURLを書き換え、市区町村エリアを更新 */}
        <div style="margin-bottom: 20px;">
          <label style="font-weight: bold;">{LABELS.PREF_LABEL}</label>
          <select 
            name="pref" 
            hx-get={`${baseUrl}${CONFIG.ENDPOINTS.CITIES}`} 
            hx-target="#city-section" 
            hx-push-url="true" // ブラウザのURLに反映
            style="width: 100%; padding: 10px; margin-top: 5px;"
          >
            <option value="">{LABELS.DEFAULT_OPTION}</option>
            {PREFECTURES.map(pref => (
              <option value={pref} selected={pref === selectedPref}>{pref}</option>
            ))}
          </select>
        </div>

        {/* 市区町村セクション：初期状態でprefがあれば自動ロード */}
        <div id="city-section" 
             hx-get={selectedPref ? `${baseUrl}${CONFIG.ENDPOINTS.CITIES}?pref=${selectedPref}&city=${selectedCity}` : undefined}
             hx-trigger="load">
          <label style="color: #ccc;">{LABELS.CITY_LABEL}</label>
          <select disabled style="width: 100%; padding: 10px; margin-top: 5px; background: #eee;">
            <option>都道府県を先に選択してください</option>
          </select>
        </div>

        <div id="loading-indicator" class="htmx-indicator" style={`color: ${CONFIG.STYLES.ACCENT_COLOR};`}>
          {LABELS.LOADING}
        </div>

        {/* SQLプレビュー：初期状態でcityがあれば自動ロード */}
        <div style="margin-top: 30px;">
          <span style="font-weight: bold;">{LABELS.SQL_HEADER}</span>
          <div id="sql-preview" 
               hx-get={selectedCity ? `${baseUrl}${CONFIG.ENDPOINTS.PREVIEW}?pref=${selectedPref}&city=${selectedCity}` : undefined}
               hx-trigger="load"
               style={`padding: 15px; background: ${CONFIG.STYLES.BG_DARK}; color: ${CONFIG.STYLES.SQL_COLOR}; font-family: monospace; border-radius: 4px; white-space: pre-wrap;`}>
            -- 選択後に表示されます --
          </div>
        </div>
      </div>
    </div>
  )
})

/**
 * 市区町村リスト取得：URLパラメータとの同期を考慮
 */
test09.get(`/${CONFIG.ENDPOINTS.CITIES}`, async (c) => {
  const pref = c.req.query('pref')
  const currentCity = c.req.query('city')
  const baseUrl = c.req.path.replace(new RegExp(`\/${CONFIG.ENDPOINTS.CITIES}$`), '/')

  if (!pref) return c.html('')

  const res = await fetch(`${CONFIG.API_BASE_URL}?method=getCities&prefecture=${encodeURIComponent(pref)}`)
  const data = await res.json() as any
  const cities = data.response.location || []

  return c.html(
    <>
      <label style="font-weight: bold;">{LABELS.CITY_LABEL} ({cities.length}件)</label>
      <select 
        name="city" 
        hx-get={`${baseUrl}${CONFIG.ENDPOINTS.PREVIEW}`} 
        hx-target="#sql-preview"
        hx-include="[name='pref']"
        hx-push-url="true" // ブラウザのURLに反映
        style={`width: 100%; padding: 10px; margin-top: 5px; border: 2px solid ${CONFIG.STYLES.ACCENT_COLOR};`}
      >
        <option value="">{LABELS.DEFAULT_OPTION}</option>
        {cities.map((loc: any) => (
          <option value={loc.city} selected={loc.city === currentCity}>{loc.city}</option>
        ))}
      </select>
    </>
  )
})

/**
 * SQLプレビュー：DBインサート用フォーマット
 */
test09.get(`/${CONFIG.ENDPOINTS.PREVIEW}`, async (c) => {
  const pref = c.req.query('pref')
  const city = c.req.query('city')

  if (!pref || !city) return c.html('-- 選択が不完全です --')

  const res = await fetch(`${CONFIG.API_BASE_URL}?method=getTowns&prefecture=${encodeURIComponent(pref)}&city=${encodeURIComponent(city)}`)
  const data = await res.json() as any
  const town = data.response.location?.[0] || { x: 0, y: 0 }

  return c.html(`INSERT INTO areas (name, parent_name, lat, lng)\nVALUES ('${city}', '${pref}', ${town.y}, ${town.x});`)
})

// 都道府県データ
const PREFECTURES = ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県", "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県", "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"]