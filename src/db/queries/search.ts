/**
 * [File Path] src/db/queries/search.ts
 */
import { cleanSql } from './utils';

export const fetchServices = async (
  db: D1Database, 
  q: string, 
  page: number, 
  limit: number = 30
) => {
  const offset = (page - 1) * limit;
  const normalizedQ = q.replace(/[\s　]/g, '');

  const conditions = ["deleted_at IS NULL"];
  const params: any[] = [];

  if (normalizedQ) {
    conditions.push(`(${cleanSql('title')} LIKE ? OR ${cleanSql('address')} LIKE ?)`);
    params.push(`%${normalizedQ}%`, `%${normalizedQ}%`);
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services ${whereSql}`)
    .bind(...params)
    .first<{count: number}>();
  
  const { results } = await db.prepare(
    `SELECT service_id, title, address, attributes_json FROM services 
     ${whereSql} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  // ★重要：以前と同じく、生の results をそのまま返す（map変換しない）
  return {
    results: results || [],
    total: countRes?.count || 0
  };
};