import { Hono } from 'hono'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const test01 = new Hono<{ Bindings: Bindings }>()

// --- ユーティリティ: JSON属性を短いラベルに変換 ---
const formatAttributes = (jsonStr: string) => {
  try {
    const attrs = JSON.parse(jsonStr || '{}')
    // 表示したい優先キーワードと変換マップ
    const map: Record<string, string> = {
      wifi: 'Wi-Fi',
      outlets: '電源',
      smoking: '喫煙可',
      baby: 'ベビーカー',
      pet: 'ペット可'
    }
    
    return Object.entries(attrs)
      .filter(([_, v]) => v === true || v === 'OK' || v === 'yes') // 有効なものだけ
      .slice(0, 3) // トップ3に制限
      .map(([k]) => map[k] || k)
  } catch {
    return []
  }
}

test01.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;
  const rawQ = c.req.query('q') || '';
  const q = rawQ.replace(/[\s　]/g, ''); // スペース除去
  
  let searchResults: any[] = [];
  let totalFound = 0;

  try {
    if (q) {
      // 🌟 スペースを無視した柔軟検索 & 30件上限
      const filterSql = `
        (REPLACE(REPLACE(title, '　', ''), ' ', '') LIKE ? 
         OR REPLACE(REPLACE(address, '　', ''), ' ', '') LIKE ?)
        AND deleted_at IS NULL
      `;

      // 総数取得
      const countRes = await db.prepare(`SELECT COUNT(*) as count FROM services WHERE ${filterSql}`)
        .bind(`%${q}%`, `%${q}%`).first<{count: number}>();
      totalFound = countRes?.count || 0;

      // データ取得 (最大30件)
      const { results } = await db.prepare(
        `SELECT service_id, title, address, attributes_json FROM services 
         WHERE ${filterSql} 
         ORDER BY created_at DESC 
         LIMIT 30`
      ).bind(`%${q}%`, `%${q}%`).all();
      
      searchResults = results;
    }

    return c.render(
      <div style="font-family: system-ui; max-width: 600px; margin: auto; padding: 16px; color: #334155;">
        <header style="margin-bottom: 24px;">
          <h2 style="font-size: 1.25rem; font-weight: 700; color: #0f172a;">ALETHEIA Sandbox</h2>
          
          <form method="get" style="display: flex; gap: 8px; margin-top: 16px;">
            <input 
              type="text" 
              name="q" 
              value={rawQ} 
              placeholder="店名や住所を入力..." 
              style="flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 16px; outline: none;"
            />
            <button type="submit" style="padding: 10px 20px; background: #1e293b; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
              検索
            </button>
          </form>
        </header>

        {q && (
          <main>
            <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 12px; display: flex; justify-content: space-between;">
              <span>「{rawQ}」の検索結果</span>
              <span>{totalFound}件中、最大30件を表示</span>
            </div>

            {searchResults.length > 0 ? (
              <div style="display: flex; flex-direction: column; gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                {searchResults.map((row) => {
                  const tags = formatAttributes(row.attributes_json);
                  return (
                    <div key={row.service_id} style="background: #fff; padding: 12px; display: flex; flex-direction: column; gap: 4px;">
                      {/* 1行目: 店名 */}
                      <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        {row.title}
                      </div>
                      {/* 2行目: 住所 + タグ */}
                      <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #64748b;">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">
                          {row.address}
                        </span>
                        {tags.length > 0 && (
                          <div style="display: flex; gap: 4px; flex-shrink: 0;">
                            {tags.map(tag => (
                              <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style="padding: 40px; text-align: center; color: #94a3b8; font-size: 0.9rem;">
                該当する店舗が見つかりませんでした。
              </div>
            )}
          </main>
        )}
      </div>
    );
  } catch (e) {
    return c.render(<div style="color: red; padding: 20px;">Error: {e instanceof Error ? e.message : 'Unknown error'}</div>);
  }
})