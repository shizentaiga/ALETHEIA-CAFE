import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

/**
 * BINDING設定
 * wrangler.toml の binding = "ALETHEIA_CAFE_DB" と一致させてください。
 */
type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const test01 = new Hono<{ Bindings: Bindings }>()

test01.get('/', async (c) => {
  const db = c.env.ALETHEIA_CAFE_DB;
  
  // クエリパラメータの取得
  const rawQ = c.req.query('q') || ''; 
  // 🌟 検索キーワードから全角・半角スペースを除去して比較用にする
  const q = rawQ.replace(/[\s　]/g, ''); 
  
  const page = parseInt(c.req.query('page') || '1'); // 現在のページ番号
  const perPage = 10; // 1ページあたりの表示件数
  const offset = (page - 1) * perPage;

  try {
    // 1. 統計情報の取得（全国、主要3都府県）
    const stats = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM services WHERE brand_id = 'brand_starbucks'").first<{count: number}>(),
      db.prepare("SELECT COUNT(*) as count FROM services WHERE address LIKE '東京都%'").first<{count: number}>(),
      db.prepare("SELECT COUNT(*) as count FROM services WHERE address LIKE '大阪府%'").first<{count: number}>(),
      db.prepare("SELECT COUNT(*) as count FROM services WHERE address LIKE '神奈川県%'").first<{count: number}>()
    ]);

    // 検索実行用の変数
    let searchResults: any[] = [];
    let totalFound = 0;

    // 2. 検索キーワードがある場合の処理
    if (q) {
      /**
       * 🌟 柔軟検索ロジック
       * DB側の title と address からも REPLACE でスペースを除去して比較します。
       * これにより「東京都 江戸川区」も「東京都江戸川区」でヒットするようになります。
       */
      const filterSql = `
        (REPLACE(REPLACE(title, '　', ''), ' ', '') LIKE ? 
         OR REPLACE(REPLACE(address, '　', ''), ' ', '') LIKE ?)
      `;

      // ヒットした全件数を取得
      const countRes = await db.prepare(
        `SELECT COUNT(*) as count FROM services WHERE ${filterSql}`
      ).bind(`%${q}%`, `%${q}%`).first<{count: number}>();
      totalFound = countRes?.count || 0;

      // 現在のページに表示する10件を取得
      const { results } = await db.prepare(
        `SELECT * FROM services WHERE ${filterSql} LIMIT ? OFFSET ?`
      )
      .bind(`%${q}%`, `%${q}%`, perPage, offset)
      .all();
      searchResults = results;
    }

    // 3. レンダリング
    return c.render(
      <div style="font-family: sans-serif; max-width: 800px; margin: auto; padding: 20px;">
        <h2>ALETHEIA 統計 & 柔軟検索テスト</h2>

        {/* 統計セクション：全国および主要都市の件数表示 */}
        <div style="background: #eef2f3; padding: 1rem; border-radius: 8px; margin-bottom: 20px; display: flex; gap: 20px; font-size: 0.9rem;">
          <div><strong>全国:</strong> {stats[0]?.count ?? 0} 件</div>
          <div><strong>東京:</strong> {stats[1]?.count ?? 0}</div>
          <div><strong>大阪:</strong> {stats[2]?.count ?? 0}</div>
          <div><strong>神奈川:</strong> {stats[3]?.count ?? 0}</div>
        </div>

        {/* 検索フォーム */}
        <form method="get" style="margin-bottom: 20px; display: flex; gap: 10px;">
          <input 
            type="text" 
            name="q" 
            value={rawQ} 
            placeholder="東京都江戸川区、スタバ新宿など..." 
            style="flex: 1; padding: 10px; border-radius: 4px; border: 1px solid #ccc;"
          />
          {/* 新しく検索する際はページを1に戻す */}
          <input type="hidden" name="page" value="1" />
          <button type="submit" style="padding: 10px 20px; background: #333; color: #fff; border: none; border-radius: 4px; cursor: pointer;">
            検索
          </button>
        </form>

        {/* 検索キーワードがある場合のみ結果を表示 */}
        {q && (
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; margin-bottom: 10px;">
              <h3>「{rawQ}」の検索結果</h3>
              <span style="font-weight: bold; color: #d32f2f;">{totalFound} 件ヒット</span>
            </div>
            
            {searchResults.length > 0 ? (
              <>
                <ul style="list-style: none; padding: 0;">
                  {searchResults.map((row) => (
                    <li key={row.service_id} style="border-bottom: 1px solid #eee; padding: 15px 0;">
                      <div style="font-weight: bold; font-size: 1.1rem;">{row.title}</div>
                      <div style="color: #666; font-size: 0.9rem; margin-top: 5px;">{row.address}</div>
                    </li>
                  ))}
                </ul>

                {/* ページネーション（前へ / 次へ）ボタン */}
                <div style="margin-top: 20px; display: flex; justify-content: center; gap: 10px; align-items: center;">
                  {page > 1 && (
                    <a 
                      href={`?q=${encodeURIComponent(rawQ)}&page=${page - 1}`} 
                      style="padding: 10px 20px; border: 1px solid #ccc; text-decoration: none; color: #333; border-radius: 4px;"
                    >
                      ← 前へ
                    </a>
                  )}
                  
                  <span style="font-size: 0.9rem; color: #666;">
                    {page} / {Math.ceil(totalFound / perPage)} ページ
                  </span>

                  {totalFound > offset + perPage && (
                    <a 
                      href={`?q=${encodeURIComponent(rawQ)}&page=${page + 1}`} 
                      style="padding: 10px 20px; background: #333; color: #fff; text-decoration: none; border-radius: 4px;"
                    >
                      次へ →
                    </a>
                  )}
                </div>
              </>
            ) : (
              <p style="color: #666;">該当する店舗が見つかりませんでした。</p>
            )}
          </div>
        )}
      </div>
    );
  } catch (e) {
    // 接続エラーや構文エラーの表示
    return c.render(
      <div style="color: red; padding: 20px; border: 1px solid red; border-radius: 8px;">
        <h3>データベースエラー</h3>
        <pre style="white-space: pre-wrap;">{e instanceof Error ? e.message : '予期せぬエラーが発生しました'}</pre>
        <p>wrangler.toml の BINDING名や、D1にテーブルが存在するか確認してください。</p>
      </div>
    );
  }
})