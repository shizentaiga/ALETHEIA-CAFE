/**
 * [File Path] src/db/queries/searchQuery.ts
 * [Role] D1Databaseに対する検索クエリの構築と実行
 * [Notes] マルチキーワード検索、論理削除の考慮、ページネーション、エリア名解決を担当
 */
import { getNormalizedKeywords, generateAreaLikePattern } from '../../lib/searchUtils';

// --- CONFIGURATION ---
const DEFAULT_LIMIT = 20; // 1ページあたりのデフォルト表示件数
// -------------------

// 💡 1. 引数の型定義をエクスポート
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
 * fetchServicesの外側に定義することでメインロジックを簡潔に保つ
 */
async function resolveAreaName(db: D1Database, area?: string): Promise<string> {
  // エリア指定がない場合はデフォルトラベル
  if (!area) return "エリアを選択";
  
  // 「00（全国）」の場合はチップを表示させないため空文字を返す
  if (area === '00') return "";

  try {
    const record = await db.prepare(`SELECT name FROM areas WHERE area_id = ?`)
      .bind(area)
      .first<{ name: string }>();
    
    // レコードがない場合はデフォルトラベルへフォールバック
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
  // 💡 2. オブジェクトから値を抽出（デフォルト値を設定）
  const { 
    db, 
    q, 
    page, 
    area, 
    limit = DEFAULT_LIMIT,
    sortBy = 'latest',
    userCoords 
  } = options;
  
  // 1. 検索準備（オフセット計算とキーワードの正規化）
  const offset = (page - 1) * limit;
  const keywords = getNormalizedKeywords(q);
  
  // SQLの基本条件（論理削除されていないデータ）
  const conditions = ["deleted_at IS NULL"];
  const params: any[] = [];

  // 2. 動的SQL構築: キーワード検索 (AND条件)
  // 各キーワードが title または address に含まれるかを確認
  if (keywords.length > 0) {
    keywords.forEach(word => {
      conditions.push(`(title LIKE ? OR address LIKE ?)`);
      params.push(`%${word}%`, `%${word}%`);
    });
  }

  // 3. 動的SQL構築: エリア検索 (前方一致)
  if (area) {
    const areaPattern = generateAreaLikePattern(area);
    // areaPattern が '%'（全国）の場合は絞り込みを行わない
    if (areaPattern !== '%') {
      conditions.push(`area_id LIKE ?`);
      params.push(areaPattern); 
    }
  }

  // WHERE句の連結
  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  // 4. データ取得実行: 全件数の取得 (ページネーション計算用)
  const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services ${whereSql}`)
    .bind(...params)
    .first<{count: number}>();
  
  // 5. データ取得実行: 実データの取得
  // 作成日順にソートし、緯度・経度(lat, lng)を含む必要なカラムを抽出
  const { results } = await db.prepare(
    `SELECT 
      service_id, 
      title, 
      address, 
      lat, 
      lng, 
      attributes_json 
    FROM services 
    ${whereSql} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  // 6. 付随情報の解決: 表示用エリア名の取得
  const areaName = await resolveAreaName(db, area);

  // 7. レスポンス返却
  // View側との互換性を維持したオブジェクト形式
  return {
    results: results || [],
    total: countRes?.count || 0,
    currentPage: page,
    limit: limit,
    areaName: areaName
  };
};