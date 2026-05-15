/**
 * [File Path] src/db/queries/searchQuery.ts
 * [Role] D1Databaseに対する検索クエリの構築と実行
 * [Notes] マルチキーワード検索、論理削除の考慮、ページネーション、エリア名解決を担当
 */
import { getNormalizedKeywords, generateAreaLikePattern } from '../../lib/searchUtils';
import { getBoundingBox, calculateDistance, isValidCoordinates } from '../../lib/geoUtils';

// --- CONFIGURATION ---
const DEFAULT_LIMIT = 20; // 1ページあたりのデフォルト表示件数
// -------------------

// 引数の型定義
export type SearchOptions = {
  db: D1Database;
  q: string | string[];
  page: number;
  area?: string;
  limit?: number;
  sortBy?: 'latest' | 'near';
  userCoords?: { lat: number; lng: number };
};

/**
 * 補助関数: エリアIDから表示用のエリア名を解決する
 */
async function resolveAreaName(db: D1Database, area?: string): Promise<string> {
  if (!area) return "エリアを選択";
  if (area === '00') return "";

  try {
    const record = await db.prepare(`SELECT name FROM areas WHERE area_id = ?`)
      .bind(area)
      .first<{ name: string }>();
    return record?.name ?? "エリアを選択";
  } catch (e) {
    console.error("Area name fetch error:", e);
    return "エリアを選択";
  }
}

/**
 * メイン関数: サービス検索実行
 */
export const fetchServices = async (options: SearchOptions) => {
  const { 
    db, 
    q, 
    page, 
    area, 
    limit = DEFAULT_LIMIT,
    sortBy = 'latest',
    userCoords 
  } = options;

  // 1. 検索準備
  const offset = (page - 1) * limit;
  const keywords = getNormalizedKeywords(q);
  
  // SQLの基本条件
  const conditions = ["deleted_at IS NULL"];
  const params: any[] = [];

  // 2. 動的SQL構築: キーワード検索
  if (keywords.length > 0) {
    keywords.forEach(word => {
      conditions.push(`(title LIKE ? OR address LIKE ?)`);
      params.push(`%${word}%`, `%${word}%`);
    });
  }

  // 3. 動的SQL構築: エリア検索
  if (area) {
    const areaPattern = generateAreaLikePattern(area);
    if (areaPattern !== '%') {
      conditions.push(`area_id LIKE ?`);
      params.push(areaPattern); 
    }
  }

  // --- 💡 空間検索・ソートロジックの注入 ---
  let selectFields = `service_id, title, address, lat, lng, attributes_json`;
  let orderBy = `created_at DESC`;

  // ユーザー座標が有効かつ「近い順」が指定されている場合
  const hasValidCoords = userCoords && 
    typeof userCoords.lat === 'number' && 
    typeof userCoords.lng === 'number' &&
    isValidCoordinates(userCoords.lat, userCoords.lng);

  if (sortBy === 'near' && hasValidCoords && userCoords) {
    const { lat, lng } = userCoords;
    
    // インデックスを効かせるため、10km圏内の矩形で絞り込み
    const bbox = getBoundingBox(lat, lng, 10);
    conditions.push(`lat BETWEEN ? AND ?`);
    params.push(bbox.minLat, bbox.maxLat);
    conditions.push(`lng BETWEEN ? AND ?`);
    params.push(bbox.minLng, bbox.maxLng);

    // 三平方の定理の簡略版（平方根なし）でソート
    // 💡 重要: SELECT句のプレースホルダ(?)は、WHERE句より先にバインドされる必要がある
    selectFields += `, ((lat - ?) * (lat - ?) + (lng - ?) * (lng - ?)) AS dist_sq`;
    params.unshift(lat, lat, lng, lng); // 配列の先頭に追加

    orderBy = `dist_sq ASC`;
  }

  // WHERE句の連結
  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  // 4. データ取得実行: 全件数の取得
  const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services ${whereSql}`)
    .bind(...params)
    .first<{count: number}>();
  
  // 5. データ取得実行: 実データの取得
  const { results } = await db.prepare(
    `SELECT ${selectFields} FROM services ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  // 6. 付随情報の解決: 精密な距離計算とエリア名
  const services = (results || []).map((row: any) => {
    let distance = null;
    if (hasValidCoords && userCoords) {
      // geoUtilsの公式を使用して、メートル単位の正確な距離を付与
      distance = Math.round(calculateDistance(userCoords.lat, userCoords.lng, row.lat, row.lng));
    }
    return { ...row, distance };
  });

  const areaName = await resolveAreaName(db, area);

  // 7. レスポンス返却
  return {
    results: services,
    total: countRes?.count || 0,
    currentPage: page,
    limit: limit,
    areaName: areaName
  };
};