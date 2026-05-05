/**
 * [File Path] src/db/queries/searchQuery.ts
 * [Role] Build search conditions and execute queries against D1.
 * [Notes] Handles multi-keyword search, soft-deletion, and pagination.
 */
import { getNormalizedKeywords } from '../../lib/searchUtils';
// import { cleanSql } from './utils'; // 必要に応じて有効化

// --- CONFIGURATION ---
const DEFAULT_LIMIT = 30; // Default records per page
// -------------------

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
   * 1. 計画書 v1.1 に基づくキーワードの正規化
   * lib/search.ts の getNormalizedKeywords を使用することで、
   * 文字列・配列のどちらが来ても「重複なし・空文字なし・最大5件」の配列に変換されます。
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
    conditions.push(`area_id LIKE ?`);
    params.push(`${area}%`); 
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
   * 既存のデータ構造 (service_id, title, address, attributes_json) を維持。
   */
  const { results } = await db.prepare(
    `SELECT service_id, title, address, attributes_json FROM services 
     ${whereSql} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  // --- 💡 今回追加する「エリア名取得」ロジック ---
  let areaName = "エリアを選択";
  if (area) {
    try {
      const areaRecord = await db.prepare(`SELECT name FROM areas WHERE area_id = ?`)
        .bind(area)
        .first<{ name: string }>();
      if (areaRecord) {
        areaName = areaRecord.name;
      }
    } catch (e) {
      console.error("Area name fetch error:", e);
      // エラー時も「エリアを選択」を維持して処理を続行させる（ビルド・実行エラー防止）
    }
  }

  // 既存の View コンポーネントとの互換性を保つため、同じオブジェクト形式で返却
  return {
    results: results || [],
    total: countRes?.count || 0,
    currentPage: page,
    limit: limit,
    areaName: areaName // 💡 新しく追加
  };
};