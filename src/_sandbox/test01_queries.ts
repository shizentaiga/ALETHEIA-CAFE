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

    const tags: string[] = [];

    // 1. 支払い方法の判定（優先処理）
    const payments = attrs.payment;

    if (Array.isArray(payments) && payments.length > 0) {
        // 判定用のフラグを事前に用意（ここが変更しやすさのポイント）
        const isCashOnly = payments.includes('CASH_ONLY');
        const hasPayPay = payments.includes('PayPay');

        // 条件の優先順位に従ってラベルを決定
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
      .filter(([k, v]) => 
        labelMap[k] && (v === true || v === 1 || v === 'OK' || v === 'yes')
      )
      .map(([k]) => labelMap[k]);

    // 支払い方法タグを先頭にして、合計3つまで返す
    return [...tags, ...otherTags].slice(0, 3);
  } catch {
    return [];
  }
};