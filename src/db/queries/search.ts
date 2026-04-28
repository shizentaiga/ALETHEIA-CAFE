/**
 * [File Path] src/db/queries/search.ts
 * [Role] 検索条件の構築とデータベース（D1）へのクエリ実行
 * [Notes] キーワード検索、論理削除の考慮、ページネーション処理を集約しています。
 */
import { cleanSql } from './utils';

// --- 設定・固定値 ---
const DEFAULT_LIMIT = 30; // 1ページあたりのデフォルト取得件数
// -------------------

/**
 * サービス検索用メイン関数
 * @param db D1Database インスタンス
 * @param q 検索キーワード（全角半角スペースは自動除去して比較）
 * @param page 取得対象のページ番号（1始まり）
 * @param limit 取得件数（未指定時はデフォルト値を使用）
 */
export const fetchServices = async (
  db: D1Database, 
  q: string, 
  page: number, 
  limit: number = DEFAULT_LIMIT
) => {
  const offset = (page - 1) * limit;
  const normalizedQ = q.replace(/[\s　]/g, '');

  // 基本条件：論理削除(deleted_at)されていない有効なデータのみを対象とする
  const conditions = ["deleted_at IS NULL"];
  const params: any[] = [];

  // キーワードがある場合：名称(title)と住所(address)を対象に部分一致検索
  if (normalizedQ) {
    // DB側と検索ワード側の両方からスペースを除去して比較（表記揺れ対策）
    conditions.push(`(${cleanSql('title')} LIKE ? OR ${cleanSql('address')} LIKE ?)`);
    params.push(`%${normalizedQ}%`, `%${normalizedQ}%`);
  }

  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  // 1. ヒット総数の取得（フロントエンドのページネーション計算に利用）
  const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services ${whereSql}`)
    .bind(...params)
    .first<{count: number}>();
  
  // 2. 実データの取得（最新順に並べ替え、LIMIT/OFFSETでページ切り出し）
  const { results } = await db.prepare(
    `SELECT service_id, title, address, attributes_json FROM services 
     ${whereSql} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  // ★重要：コンポーネント側との互換性を保つため、生の results をそのまま返却
  return {
    results: results || [],
    total: countRes?.count || 0
  };
};