/**
 * [File Path] src/db/queries/searchQuery.ts
 * [Role] Build search conditions and execute queries against D1.
 * [Notes] Handles multi-keyword search, soft-deletion, and pagination.
 */
import { getNormalizedKeywords, generateAreaLikePattern } from '../../lib/searchUtils';

// --- CONFIGURATION ---
const DEFAULT_LIMIT = 30; // Default records per page
// -------------------

// fetchServicesの外側に定義
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
 * Main service search function.
 * @param db - D1Database instance
 * @param q - Search keywords (Accepts both string and string array for compatibility)
 * @param page - Target page number (1-based)
 * @param area - Target area (Optional)
 * @param limit - Max records to fetch
 */
export const fetchServices = async (
  db: D1Database, 
  q: string | string[], // 互換性維持のため string も許容
  page: number, 
  area?: string, 
  limit: number = DEFAULT_LIMIT
) => {
  const offset = (page - 1) * limit;

  /**
   * 1. キーワードの正規化：「重複なし・空文字なし・最大5件」
   */
  const keywords = getNormalizedKeywords(q);
  
  // Base Condition: 有効なデータのみ（論理削除済みを除外）
  const conditions = ["deleted_at IS NULL"];
  const params: any[] = [];

  /**
   * 2. 動的 SQL 生成 (AND 条件)
   * INTERSECT ではなく、パフォーマンスと汎用性の高い AND 結合を採用。
   * 各キーワードに対して title または address のいずれかにヒットすることを条件化。
   */
  if (keywords.length > 0) {
    keywords.forEach(word => {
      conditions.push(`(title LIKE ? OR address LIKE ?)`);
      params.push(`%${word}%`, `%${word}%`);
    });
  }

  // 3. エリア検索 (前方一致)
  if (area) {
    const areaPattern = generateAreaLikePattern(area);
    // areaPattern が '%' の場合は「全国」なので、WHERE句に条件を追加しない
    if (areaPattern !== '%') {
      conditions.push(`area_id LIKE ?`);
      params.push(areaPattern); 
    }
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  /**
   * 1. 全件数の取得 (ページネーション用)
   */
  const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services ${whereSql}`)
    .bind(...params)
    .first<{count: number}>();
  
  /**
     * 2. 実データの取得 (最新順、LIMIT/OFFSET適用)
     * 修正点: 緯度(lat)と経度(lng)を SELECT カラムに追加
     */
    const { results } = await db.prepare(
      `SELECT 
        service_id, 
        title, 
        address, 
        lat,             -- 追加
        lng,             -- 追加
        attributes_json 
      FROM services 
      ${whereSql} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

  // --- 💡 「エリア名取得」ロジック ---
  const areaName = await resolveAreaName(db, area);

  // 既存の View コンポーネントとの互換性を保つため、同じオブジェクト形式で返却
  return {
    results: results || [],
    total: countRes?.count || 0,
    currentPage: page,
    limit: limit,
    areaName: areaName // 💡 新しく追加
  };
};