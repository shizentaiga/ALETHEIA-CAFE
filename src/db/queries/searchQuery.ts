/**
 * [File Path] src/db/queries/searchQuery.ts
 * [Role] D1Databaseに対する検索クエリの構築と実行
 * [Notes] マルチキーワード検索、論理削除の考慮、ページネーション、エリア名解決を担当
 */
import { getNormalizedKeywords, generateAreaLikePattern } from '../../lib/searchUtils';
import { calculateDistance, isValidCoordinates } from '../../lib/geoUtils';
import { calculateNearestStations } from '../../db/queries/stationQuery';
import { formatAccessTime } from '../../lib/geoUtils';

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
 * 補助関数: エリアIDから「名前」と「基準座標」を解決する
 */
export async function fetchAreaCoordInfo(db: D1Database, areaId?: string) {
  // areaIdがない場合はデフォルトで全国(00)として扱う
  const targetId = areaId || '00';

  try {
    const record = await db.prepare(`SELECT name, lat, lng FROM areas WHERE area_id = ?`)
      .bind(targetId)
      .first<{ name: string; lat: number; lng: number }>();
    
    return {
      name: record?.name ?? (targetId === '00' ? "" : "エリアを選択"),
      lat: record?.lat ?? null,
      lng: record?.lng ?? null
    };
  } catch (e) {
    console.error("Area info fetch error:", e);
    return { name: "", lat: null, lng: null };
  }
}

/**
 * メイン関数: サービス検索実行
 */
export const fetchServices = async (options: SearchOptions) => {
  // 1. 変数の準備
  const { db, q, page, area, limit = DEFAULT_LIMIT, sortBy = 'latest', userCoords } = options;
  const offset = (page - 1) * limit;
  const keywords = getNormalizedKeywords(q);
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

  if (hasValidCoords && sortBy === 'near') {
    const { lat, lng } = userCoords!;
    // 数値を直接埋め込むことで、params.unshift(lat, lat...) を完全に廃止
    selectFields += `, ((lat - ${lat}) * (lat - ${lat}) + (lng - ${lng}) * (lng - ${lng})) AS dist_sq`;
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

  // 6. 最寄駅と駅座標の取得
  const services = await Promise.all((results || []).map(async (row: any) => {
    // 6-1. ユーザー位置からの距離（ソート用）
    const userDistance = hasValidCoords ? Math.round(calculateDistance(userCoords!.lat, userCoords.lng, row.lat, row.lng)) : null;

    // 6-2. 最寄駅とアクセス情報の取得(async関数は、awaitが必須)
    const stations = await calculateNearestStations(db, row.lat, row.lng, 1);
    const nearestStation = stations.length > 0 ? stations[0] : null;
    
    const access = nearestStation ? formatAccessTime(
      nearestStation.distance,
      nearestStation.lat, nearestStation.lng, // 駅座標
      row.lat, row.lng                        // 店舗座標
    ) : null;

    return { 
      ...row, 
      userDistance, 
      nearestStation, 
      access 
    };
  }));

  // 7. レスポンス返却
  return {
    results: services,
    total: countRes?.count || 0,
    currentPage: page,
    limit: limit,
  };
};