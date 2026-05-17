/**
 * [File Path] src/_sandbox/test15_attributes.tsx
 */

import { Hono } from 'hono'
import { html } from 'hono/html'
// 💡 本番用の定義ファイルから、特徴配列と変換関数をそのままインポート
import { SMOKING_LABELS, UNIQUE_FEATURES, INFRA_FEATURES, formatAttributes } from '../db/queries/transformers'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const test15 = new Hono<{ Bindings: Bindings }>()

// 統計データの型定義
interface AttributeStats {
  total_count: number;
  wifi_count: number;
  outlets_count: number;
  parking_count: number;
  takeout_count: number;
  buffet_count: number;
  pop_buffet_count: number;
  free_refill_count: number;
  baby_count: number;
  smoking_count: number; // 💡 統計型にタバコ用カウントを追加
}

// スキーマに完全に適合させた店舗データの型定義
interface ShopItem {
  service_id: string;
  title: string;
  address: string;
  attributes_json: string;
}

// 固定文言の定義（ハードコード）を完全排除！
// インポートした本番用マスタ配列を自動的にマージして、既存ロジックと互換性を保ちます
const ATTRIBUTE_MASTER = [...UNIQUE_FEATURES, ...INFRA_FEATURES];

test15.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`

  // 選択されたチェックボックスの配列を取得
  const selectedAttrs = c.req.queries('attributes[]') || []
  // 💡 クエリパラメータからタバコ可の選択状態を取得
  const isSmokingSelected = c.req.query('smoking') === 'true'

  // --- [1] 統計情報の1クエリ爆速集計 ---
  // 💡 最後の行に、smokingがNO_SMOKING以外（＝タバコ可）である件数を集計するロジックを追加
  const statsQuery = `
    SELECT 
      COUNT(*) as total_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.wifi') = true THEN 1 ELSE 0 END) as wifi_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.outlets') = true THEN 1 ELSE 0 END) as outlets_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.parking') = true THEN 1 ELSE 0 END) as parking_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.takeout') = true THEN 1 ELSE 0 END) as takeout_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.buffet') = true THEN 1 ELSE 0 END) as buffet_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.pop_buffet') = true THEN 1 ELSE 0 END) as pop_buffet_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.free_refill') = true THEN 1 ELSE 0 END) as free_refill_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.baby') = true THEN 1 ELSE 0 END) as baby_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.smoking') IN ('SMOKING_ROOM', 'SMOKING_SEATS', 'ALL_SMOKING') THEN 1 ELSE 0 END) as smoking_count
    FROM services
    WHERE deleted_at IS NULL;
  `
  let stats: AttributeStats = {
    total_count: 0, wifi_count: 0, outlets_count: 0, parking_count: 0, takeout_count: 0,
    buffet_count: 0, pop_buffet_count: 0, free_refill_count: 0, baby_count: 0, smoking_count: 0
  }

  // --- [2] スキーマに合わせてSQLを修正（service_id, title） ---
  let shopsQuery = `SELECT service_id, title, address, attributes_json FROM services WHERE deleted_at IS NULL`
  const queryParams: any[] = []

  if (selectedAttrs.length > 0) {
    selectedAttrs.forEach((attrKey) => {
      if (ATTRIBUTE_MASTER.some(m => m.key === attrKey)) {
        shopsQuery += ` AND json_extract(attributes_json, '$.' || ?) = true`
        queryParams.push(attrKey)
      }
    })
  }

  // 💡 タバコ可のチェックボックスが選択されている場合、条件式を追加（IN句で3つのステータスを内包）
  if (isSmokingSelected) {
    shopsQuery += ` AND json_extract(attributes_json, '$.smoking') IN ('SMOKING_ROOM', 'SMOKING_SEATS', 'ALL_SMOKING')`
  }

  shopsQuery += ` LIMIT 10;`

  let shopList: ShopItem[] = []

  try {
    const [statsResult, shopsResult] = await Promise.all([
      db.prepare(statsQuery).first<AttributeStats>(),
      db.prepare(shopsQuery).bind(...queryParams).all<ShopItem>()
    ])
    if (statsResult) stats = statsResult
    if (shopsResult.results) shopList = shopsResult.results
  } catch (e) {
    console.error('Database operational error:', e)
  }

  const isHtmx = c.req.header('HX-Request') === 'true'

  // 💡 描画側（店舗チップ生成）に本番用の formatAttributes を適用して完全統一
  const renderShopList = (shops: ShopItem[]) => html`
    <div id="shop-list-target">
      <div style="margin: 12px 0; color: #64748b; font-size: 0.85rem; font-weight: 600;">
        該当店舗: ${shops.length} 件を表示 (最大10件)
      </div>
      <div style="display: grid; gap: 12px;">
        ${shops.length === 0 ? html`
          <div style="padding: 20px; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: 8px;">
            条件に一致する店舗が見つかりませんでした。
          </div>
        ` : shops.map(shop => {
          // 💡 ここで本番の判定ロジック（タバコ可の自動追加やMAX 4制約など）をそのまま反映します
          const displayedTags = formatAttributes(shop.attributes_json);
          
          return html`
            <div style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;">
              <strong style="color: #1e293b; font-size: 1rem;">${shop.title}</strong>
              <div style="color: #64748b; font-size: 0.75rem; margin-top: 4px;">📍 ${shop.address}</div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
                ${displayedTags.map(tag => html`
                  <span style="font-size: 0.65rem; background: #f1f5f9; padding: 2px 8px; border-radius: 999px; color: #475569;">
                    ${tag}
                  </span>
                `)}
              </div>
            </div>
          `
        })}
      </div>
    </div>
  `

  if (isHtmx) {
    return c.html(renderShopList(shopList))
  }

  return c.render(
    <>
      <header style="border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
        <a href={baseUrl} style="text-decoration: none; color: inherit;">
          <h1>ALETHEIA 特徴絞り込みサンドボックス</h1>
        </a>
      </header>
      
      <main style="padding: 20px 0; display: flex; gap: 24px; flex-wrap: wrap;">
        
        <section style="flex: 1; min-width: 280px; max-width: 360px;">
          <h2>⚙️ 特徴で絞り込む</h2>
          
          <form 
            method="get" 
            action={baseUrl}
            hx-get={baseUrl}
            hx-trigger="change"
            hx-target="#shop-list-target"
            hx-swap="outerHTML"
            style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;"
          >
            <div style="display: flex; flex-direction: column; gap: 10px;">
              {ATTRIBUTE_MASTER.map(attr => {
                const countKey = `${attr.key}_count` as keyof AttributeStats
                const count = stats[countKey] || 0
                const isChecked = selectedAttrs.includes(attr.key)

                return (
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <input 
                        type="checkbox" 
                        name="attributes[]" 
                        value={attr.key} 
                        checked={isChecked}
                        style="width: 16px; height: 16px; cursor: pointer;"
                      />
                      <span>{attr.label}</span>
                    </div>
                    <span style="color: #94a3b8; font-size: 0.8rem;">({count})</span>
                  </label>
                )
              })}

              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <input 
                    type="checkbox" 
                    name="smoking" 
                    value="true" 
                    checked={isSmokingSelected}
                    style="width: 16px; height: 16px; cursor: pointer;"
                  />
                  <span>{SMOKING_LABELS.SMOKING_ROOM}</span>
                </div>
                <span style="color: #94a3b8; font-size: 0.8rem;">({stats.smoking_count})</span>
              </label>
            </div>
            <noscript>
              <button type="submit" style="margin-top: 12px; width: 100%; padding: 8px; border-radius: 6px; background: #374151; color: #fff; border: none;">適用</button>
            </noscript>
          </form>
        </section>

        <section style="flex: 2; min-width: 320px;">
          <h2>🏪 対象店舗一覧</h2>
          {renderShopList(shopList)}
        </section>

      </main>
    </>
  )
})

export default test15