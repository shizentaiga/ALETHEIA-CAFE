import { Hono } from 'hono'

export const test03 = new Hono()

// --- 1. 擬似データ（本来はDBから取得） ---
const MASTER_DATA = {
  areas: [
    { id: '1', name: '関東' },
    { id: '2', name: '関西' },
  ],
  prefs: {
    '1': [{ id: '13', name: '東京都' }, { id: '14', name: '神奈川県' }],
    '2': [{ id: '27', name: '大阪府' }, { id: '28', name: '兵庫県' }],
  },
  cities: {
    '13': [{ id: '13101', name: '千代田区' }, { id: '13102', name: '中央区' }],
    '27': [{ id: '27101', name: '大阪市北区' }, { id: '27102', name: '大阪市中央区' }],
  }
}

// --- 2. 汎用コンポーネント（見た目だけを担当） ---
// デザインを変えたいときは、この関数の HTML 構造だけを直せば OK
const FilterLink = ({ href, label, active }: { href: string; label: string; active: boolean }) => (
  <a href={href} style={{
    display: 'inline-block',
    padding: '8px 12px',
    margin: '4px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    textDecoration: 'none',
    background: active ? '#4285F4' : '#fff',
    color: active ? '#fff' : '#333',
  }}>
    {label}
  </a>
)

// --- 3. メインルート ---
test03.get('/', (c) => {
  // URLパラメータから現在の選択状態を取得
  const areaId = c.req.query('area_id')
  const prefId = c.req.query('pref_id')
  const cityId = c.req.query('city_id')

  // 次に表示すべきリストを決定
  const areas = MASTER_DATA.areas
  const prefs = areaId ? (MASTER_DATA.prefs[areaId as keyof typeof MASTER_DATA.prefs] || []) : []
  const cities = prefId ? (MASTER_DATA.cities[prefId as keyof typeof MASTER_DATA.cities] || []) : []

  return c.render(
    <div style="padding: 20px;">
      <h2>汎用ドリルダウン・テスト</h2>

      {/* ステップ1: エリア選択 */}
      <section style="margin-bottom: 20px;">
        <h3>1. エリア</h3>
        {areas.map(a => (
          <FilterLink 
            href={`?area_id=${a.id}`} 
            label={a.name} 
            active={areaId === a.id} 
          />
        ))}
        {areaId && <a href="?" style="font-size: 0.8rem; margin-left: 10px;">リセット</a>}
      </section>

      {/* ステップ2: 都道府県（エリアが選ばれている時だけ表示） */}
      {areaId && (
        <section style="margin-bottom: 20px;">
          <h3>2. 都道府県</h3>
          {prefs.length > 0 ? prefs.map(p => (
            <FilterLink 
              href={`?area_id=${areaId}&pref_id=${p.id}`} 
              label={p.name} 
              active={prefId === p.id} 
            />
          )) : <p>選択肢がありません</p>}
        </section>
      )}

      {/* ステップ3: 市区町村（都道府県が選ばれている時だけ表示） */}
      {prefId && (
        <section style="margin-bottom: 20px;">
          <h3>3. 市区町村</h3>
          {cities.length > 0 ? cities.map(city => (
            <FilterLink 
              href={`?area_id=${areaId}&pref_id=${prefId}&city_id=${city.id}`} 
              label={city.name} 
              active={cityId === city.id} 
            />
          )) : <p>選択肢がありません</p>}
        </section>
      )}

      <hr />

      {/* 結果表示デバッグ */}
      <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
        <h4 style="margin-top: 0;">現在の検索条件:</h4>
        <code>
          AREA: {areaId || '未選択'} / 
          PREF: {prefId || '未選択'} / 
          CITY: {cityId || '未選択'}
        </code>
      </div>
    </div>
  )
})