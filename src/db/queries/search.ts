/**
 * [File Path] src/db/queries/search.ts
 * [Role] 検索条件の構築とデータベース（D1）へのクエリ実行
 */

import { cleanSql } from './utils';
import { transformService } from './transformers';

/**
 * サービス検索用メイン関数
 * キーワード検索（名称・住所）、ページネーション、および論理削除の考慮を含みます。
 * @param db D1Database インスタンス
 * @param q 検索キーワード（全角半角スペースは内部で自動除去）
 * @param page 取得対象のページ番号（1始まり）
 * @param limit 1ページあたりの取得件数（デフォルト30件）
 */
export const fetchServices = async (
  db: D1Database, 
  q: string, 
  page: number, 
  limit: number = 30
) => {
  const offset = (page - 1) * limit;
  const normalizedQ = q.replace(/[\s　]/g, '');

  // 基本条件：論理削除されていないデータのみ対象
  const conditions = ["deleted_at IS NULL"];
  const params: any[] = [];

  // キーワードがある場合：名称と住所を対象に部分一致検索（表記揺れ対応）
  if (normalizedQ) {
    conditions.push(`(${cleanSql('title')} LIKE ? OR ${cleanSql('address')} LIKE ?)`);
    params.push(`%${normalizedQ}%`, `%${normalizedQ}%`);
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  // 1. ヒット総数の取得
  const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services ${whereSql}`)
    .bind(...params)
    .first<{count: number}>();
  
  // 2. 実データの取得（最新順・ページネーション適用）
  const { results } = await db.prepare(
    `SELECT * FROM services ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return {
    // 取得した生のレコードを transformers.ts の整形ロジックに通して返す
    results: (results || []).map(transformService),
    total: countRes?.count || 0
  };
};