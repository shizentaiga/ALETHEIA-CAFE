/**
 * [File Path] src/db/queries/search.ts
 * [Role] Build search conditions and execute queries against D1.
 * [Notes] Handles multi-keyword search, soft-deletion, and pagination.
 */
import { cleanSql } from './utils';

// --- CONFIGURATION ---
const DEFAULT_LIMIT = 30; // Default records per page
// -------------------

/**
 * Main service search function.
 * @param db - D1Database instance
 * @param q - Search keywords (Split by spaces for AND search)
 * @param page - Target page number (1-based)
 * @param area - Target area (Optional)
 * @param limit - Max records to fetch
 */
export const fetchServices = async (
  db: D1Database, 
  q: string, 
  page: number, 
  area?: string, 
  limit: number = DEFAULT_LIMIT
) => {
  const offset = (page - 1) * limit;

  // 1. Split query into an array of keywords
  const keywords = q.trim().split(/[\s　]+/).filter(Boolean);

  // Base Condition: Target only active data (not soft-deleted)
  const conditions = ["deleted_at IS NULL"];
  const params: any[] = [];

  // 2. Generate AND conditions for each keyword if provided
  if (keywords.length > 0) {
    keywords.forEach(word => {
      // Search across both title and address
      conditions.push(`(title LIKE ? OR address LIKE ?)`);
      params.push(`%${word}%`, `%${word}%`);
    });
  }

  // 3. Area search (Starts with match)
  if (area) {
    conditions.push(`address LIKE ?`);
    params.push(`${area}%`); 
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  // 1. Get total hit count for pagination calculations
  const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services ${whereSql}`)
    .bind(...params)
    .first<{count: number}>();
  
  // 2. Fetch actual data (Ordered by latest, clipped by LIMIT/OFFSET)
  const { results } = await db.prepare(
    `SELECT service_id, title, address, attributes_json FROM services 
     ${whereSql} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  // Return raw results to maintain compatibility with view components
  return {
    results: results || [],
    total: countRes?.count || 0
  };
};