import { Hono } from 'hono'
import { fetchServices, formatAttributes } from './test01_queries'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const test01 = new Hono<{ Bindings: Bindings }>()

// // --- 1. DBアクセス関数 (queries.ts 相当) ---
// // 検索条件に応じたデータの取得と、ヒット総数を返す
// const fetchServices = async (db: D1Database, q: string, page: number, limit: number = 30) => {
//   const offset = (page - 1) * limit;
//   const normalizedQ = q.replace(/[\s　]/g, '');

//   let whereClause = "WHERE deleted_at IS NULL";
//   let params: any[] = [];

//   if (normalizedQ) {
//     whereClause += ` AND (REPLACE(REPLACE(title, '　', ''), ' ', '') LIKE ? 
//                       OR REPLACE(REPLACE(address, '　', ''), ' ', '') LIKE ?)`;
//     params.push(`%${normalizedQ}%`, `%${normalizedQ}%`);
//   }

//   // 総数の取得
//   const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services ${whereClause}`)
//     .bind(...params).first<{count: number}>();
  
//   // データの取得 (常に30件上限)
//   const { results } = await db.prepare(
//     `SELECT service_id, title, address, attributes_json FROM services 
//      ${whereClause} 
//      ORDER BY created_at DESC 
//      LIMIT ? OFFSET ?`
//   ).bind(...params, limit, offset).all();

//   return {
//     results,
//     total: countRes?.count || 0
//   };
// }

// // --- 2. ユーティリティ ---
// const formatAttributes = (jsonStr: string) => {
//   try {
//     const attrs = JSON.parse(jsonStr || '{}');
//     const map: Record<string, string> = { 
//       wifi: 'Wi-Fi', outlets: '電源', baby: 'お子様連れ', smoking: '喫煙', pet: 'ペット' 
//     };
//     return Object.entries(attrs)
//       .filter(([_, v]) => v === true || v === 'OK' || v === 'yes')
//       .slice(0, 3)
//       .map(([k]) => map[k] || k);
//   } catch { return []; }
// }

// --- 3. メイン処理 ---
test01.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;
  const q = c.req.query('q') || '';
  const page = parseInt(c.req.query('page') || '1');
  const perPage = 30;

  try {
    // 関数呼び出しでデータ取得
    const { results, total } = await fetchServices(db, q, page, perPage);

    return c.render(
      <div style="font-family: system-ui; max-width: 600px; margin: auto; padding: 16px; color: #334155;">
        <header style="margin-bottom: 20px;">
          <h2 style="font-size: 1.1rem; color: #0f172a;">ALETHEIA Sandbox (test01)</h2>
          <form method="get" style="display: flex; gap: 8px; margin-top: 12px;">
            <input 
              type="text" name="q" value={q} placeholder="店名や住所で検索..." 
              style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px;"
            />
            <button type="submit" style="padding: 8px 16px; background: #1e293b; color: #fff; border: none; border-radius: 8px; font-weight: 600;">
              検索
            </button>
          </form>
        </header>

        <main>
          <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span>{q ? `「${q}」の検索結果` : '全国の新着店舗'}</span>
            <span>{total}件中 / {results.length}件表示</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            {results.map((row: any) => {
              const tags = formatAttributes(row.attributes_json);
              return (
                <div key={row.service_id} style="background: #fff; padding: 12px; display: flex; flex-direction: column; gap: 4px;">
                  <div style="font-weight: 600; color: #1e293b; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    {row.title}
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: #64748b;">
                    <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{row.address}</span>
                    {tags.map(tag => (
                      <span style="background: #f1f5f9; padding: 1px 5px; border-radius: 4px; flex-shrink: 0;">{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ページネーション:「次へ」を実装 */}
          <div style="margin-top: 20px; display: flex; justify-content: center; align-items: center; gap: 16px;">
            {page > 1 && (
              <a href={`?q=${encodeURIComponent(q)}&page=${page - 1}`} style="font-size: 0.85rem; color: #3b82f6; text-decoration: none;">← 前の30件</a>
            )}
            <span style="font-size: 0.8rem; color: #94a3b8;">Page {page}</span>
            {total > page * perPage && (
              <a href={`?q=${encodeURIComponent(q)}&page=${page + 1}`} style="font-size: 0.85rem; color: #3b82f6; text-decoration: none;">次の30件 →</a>
            )}
          </div>
        </main>
      </div>
    );
  } catch (e) {
    return c.render(<div style="padding: 20px; color: red;">Error: {e instanceof Error ? e.message : 'Unknown'}</div>);
  }
})