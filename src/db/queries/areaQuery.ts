import { D1Database } from '@cloudflare/workers-types'

/**
 * 【エリア取得】特定の親IDに紐づく直下の子階層リストを取得する
 * 
 * @param db - D1Database
 * @param parentId - 親エリアのID (例: '10' や '10-13')。null の場合は Level 1 (地方) を取得
 * @returns 子エリアのリスト (area_id, name, area_level)
 * 
 * @logic
 * - parentId がある場合: area_id LIKE parentId || '-%' かつ level を +1 して検索
 * - parentId がない場合: area_level = 1 を検索
 */
export const getSubAreas = async (db: D1Database, parentId: string | null) => {
  // TODO: Implement Step 1 logic
}

/**
 * 【最寄りエリア特定】指定された座標から最短距離にある Level 3 (市区町村) を1件取得する
 * 
 * @param db - D1Database
 * @param lat - 緯度
 * @param lng - 経度
 * @returns 最寄りのエリア情報 (area_id, name)
 * 
 * @logic
 * - area_level = 3 のレコードを対象にする
 * - 緯度・経度の二乗和による近似距離計算を用い、最も値が小さいものを LIMIT 1 で取得
 */
export const getNearestCityArea = async (db: D1Database, lat: number, lng: number) => {
  // TODO: Implement Step 3 logic
}

/**
 * 【親エリア情報取得】指定された area_id 自体の情報を取得する（「すべて」オプション用）
 * 
 * @param db - D1Database
 * @param areaId - エリアID
 * @returns エリアの名前情報
 */
export const getAreaInfo = async (db: D1Database, areaId: string) => {
  // TODO: Implement for "All [Parent Name]" labels
}