/**
 * サービス検索用クエリ関数
 * @param db D1Database インスタンス
 * @param q 検索キーワード（スペースは内部で除去）
 * @param page 取得対象のページ番号
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

  let whereClause = "WHERE deleted_at IS NULL";
  let params: any[] = [];

  // キーワードがある場合のみ条件を追加
  if (normalizedQ) {
    whereClause += ` AND (REPLACE(REPLACE(title, '　', ''), ' ', '') LIKE ? 
                      OR REPLACE(REPLACE(address, '　', ''), ' ', '') LIKE ?)`;
    params.push(`%${normalizedQ}%`, `%${normalizedQ}%`);
  }

  // 1. ヒット総数の取得（ページネーション計算用）
  const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services ${whereClause}`)
    .bind(...params)
    .first<{count: number}>();
  
  // 2. 実データの取得（LIMIT/OFFSETによる節約）
  const { results } = await db.prepare(
    `SELECT service_id, title, address, attributes_json FROM services 
     ${whereClause} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  return {
    results: results || [],
    total: countRes?.count || 0
  };
};

/**
 * 属性JSONを短い表示用ラベルの配列に変換する
 */
export const formatAttributes = (jsonStr: string): string[] => {
  try {
    const attrs = JSON.parse(jsonStr || '{}');
    const labelMap: Record<string, string> = { 
      wifi: 'Wi-Fi', 
      outlets: '電源', 
      baby: 'お子様連れ', 
      smoking: '喫煙', 
      pet: 'ペット可' 
    };

    return Object.entries(attrs)
      .filter(([_, v]) => 
        v === true ||   // JSのbooleanとしてのtrue
        v === 1 ||      // SQLiteの真偽値(1)
        v === 'OK' || 
        v === 'yes'
      )
      .slice(0, 3)
      .map(([k]) => labelMap[k] || k);
  } catch {
    return [];
  }
};