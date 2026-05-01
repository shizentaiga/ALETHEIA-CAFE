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
 * @param area 対象エリア(東京都など。)
 * @param limit 取得件数（未指定時はデフォルト値を使用）
 */
export const fetchServices = async (
  db: D1Database, 
  q: string, 
  page: number, 
  area?: string, // ★追加：エリア引数（任意）
  limit: number = DEFAULT_LIMIT
) => {
  const offset = (page - 1) * limit;

  // 1. スペースで分割してキーワードの配列を作る
  const keywords = q.trim().split(/[\s　]+/).filter(Boolean);

  // 基本条件：論理削除(deleted_at)されていない有効なデータのみを対象とする
  const conditions = ["deleted_at IS NULL"];
  const params: any[] = [];

  // 2. キーワードがある場合、各単語に対して AND 条件を生成する
  if (keywords.length > 0) {
    keywords.forEach(word => {
      // 各単語が title または address のいずれかに含まれているか
      conditions.push(`(title LIKE ? OR address LIKE ?)`);
      params.push(`%${word}%`, `%${word}%`);
    });
  }

  // 3. エリア検索（★スモールスタート：まずは完全一致）
  if (area) {
    // 住所のカラムに「東京都」などが含まれているか前方一致で判定
    conditions.push(`address LIKE ?`);
    params.push(`${area}%`); 
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