/**
 * サービス検索・属性変換モジュール
 * [役割] データベース(D1)からの情報取得と、表示用タグへの整形を担当
 * [入力] 検索キーワード(表記揺れ対応)、ページ番号、およびDB内の属性JSON
 * [出力] 検索結果一覧(total件数含む)と、UI表示に最適化された最大3つの属性ラベル
 */

/**
 * 共通ユーティリティ: 真偽値（またはそれに準ずる値）を判定
 */
const isTruthy = (v: any): boolean => 
  v === true || v === 1 || v === 'OK' || v === 'yes';

/**
 * 属性JSONの型定義
 */
interface ServiceAttributes {
  payment?: string[];
  [key: string]: any;
}

/**
 * サービス検索用クエリ関数
 * @param db D1Database インスタンス
 * @param q 検索キーワード（スペースは内部で自動除去）
 * @param page 取得対象のページ番号（1始まり）
 * @param limit 1ページあたりの取得件数
 */
export const fetchServices = async (
  db: D1Database, 
  q: string, 
  page: number, 
  limit: number = 30
) => {
  const offset = (page - 1) * limit;
  const normalizedQ = q.replace(/[\s　]/g, '');

  // 条件とパラメータを分離して管理（WHERE句の動的拡張に対応）
  const conditions = ["deleted_at IS NULL"];
  const params: any[] = [];

  if (normalizedQ) {
    // 【検索ロジック】DB側と検索ワード側の両方からスペースを除去して比較（表記揺れ対策）
    const cleanSql = (col: string) => `REPLACE(REPLACE(${col}, '　', ''), ' ', '')`;
    
    conditions.push(`(${cleanSql('title')} LIKE ? OR ${cleanSql('address')} LIKE ?)`);
    params.push(`%${normalizedQ}%`, `%${normalizedQ}%`);
  }

  // WHERE句を「AND」で結合して構築
  const whereSql = `WHERE ${conditions.join(' AND ')}`;

  // 1. ヒット総数の取得（フロントエンドのページネーション制御に必要）
  const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services ${whereSql}`)
    .bind(...params)
    .first<{count: number}>();
  
  // 2. 実データの取得（最新順で取得し、LIMIT/OFFSETで負荷を軽減）
  const { results } = await db.prepare(
    `SELECT service_id, title, address, attributes_json FROM services 
     ${whereSql} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return {
    results: results || [],
    total: countRes?.count || 0
  };
};

/**
 * 属性JSONを短い表示用ラベル（タグ）の配列に変換する
 */
export const formatAttributes = (jsonStr: string): string[] => {
  try {
    const attrs: ServiceAttributes = JSON.parse(jsonStr || '{}');
    const labelMap: Record<string, string> = { 
      wifi: 'Wi-Fi', 
      outlets: '電源', 
      baby: 'お子様連れ', 
      smoking: '喫煙', 
      pet: 'ペット可' 
    };

    const tags: string[] = [];

    // 1. 支払い方法の判定（優先的に先頭に表示）
    const payments = attrs.payment;
    if (Array.isArray(payments) && payments.length > 0) {
      const isCashOnly = payments.includes('CASH_ONLY');
      const hasPayPay = payments.includes('PayPay');

      if (isCashOnly) {
        tags.push('現金のみ');
      } else if (hasPayPay) {
        tags.push('PayPay可');
      } else {
        tags.push('キャッシュレス可');
      }
    }

    // 2. その他の属性フラグ（Wi-Fi、電源など）を結合
    const otherTags = Object.entries(attrs)
      .filter(([k, v]) => labelMap[k] && isTruthy(v))
      .map(([k]) => labelMap[k]);

    // 支払い方法を左側に配置し、UIの美観のため最大3つに制限
    return [...tags, ...otherTags].slice(0, 3);
  } catch {
    return []; // JSON解析エラー時は空配列を返してクラッシュを防止
  }
};