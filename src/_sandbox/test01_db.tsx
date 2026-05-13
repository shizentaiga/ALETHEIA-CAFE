// src/_sandbox/test01_db.tsx

/**
 * ALETHEIA Sandbox - サービス検索一覧画面 (test01)
 * 最寄駅・アクセス情報表示対応版
 */
import { Hono } from 'hono'
import { fetchServices, formatAttributes,calculateNearestStations } from '../db/queries/main'
import { formatAccessTime } from '../lib/geoUtils'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const test01 = new Hono<{ Bindings: Bindings }>()

test01.get('/', async (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;
  const db = c.env.ALETHEIA_CAFE_DB;
  const q = c.req.query('q') || '';
  const page = parseInt(c.req.query('page') || '1');
  const perPage = 30;

  try {
    // 1. サービスの基本情報を取得
    const { results, total } = await fetchServices(db, q, page);

    // 2. 各店舗ごとの最寄駅情報を並列で取得して合成
    const resultsWithAccess = await Promise.all(
      results.map(async (row: any) => {
        // 最寄駅を1件検索
        const stations = await calculateNearestStations(db, row.lat, row.lng, 1);
        const nearestStation = stations.length > 0 ? stations[0] : null;

        // アクセス時間の計算 (直線距離 -> 徒歩/車表記)
        const access = nearestStation 
          ? formatAccessTime(nearestStation.distance)
          : null;

        return {
          ...row,
          nearestStation,
          access
        };
      })
    );

    return c.render(
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: auto; padding: 16px; color: #334155;">
        {/* ヘッダー・検索フォーム */}
        <header style="margin-bottom: 20px;">

          {/* トップに戻る */}
          <a href={baseUrl}><h1>ALETHEIA</h1></a>  
          
          <form method="get" style="display: flex; gap: 8px; margin-top: 12px;">
            <input 
              type="text" 
              name="q" 
              value={q} 
              placeholder="店名や住所で検索..." 
              style="flex: 1; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px;"
            />
            <button type="submit" style="padding: 8px 16px; background: #1e293b; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
              検索
            </button>
          </form>
        </header>

        <main>
          {/* 検索ステータス */}
          <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <span>{q ? `「${q}」の検索結果` : '全国の新着店舗'}</span>
            <span>{total}件中 / {results.length}件表示</span>
          </div>

          {/* リスト表示 */}
          <div style="display: flex; flex-direction: column; gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            {resultsWithAccess.length > 0 ? (
              resultsWithAccess.map((row) => {
                const tags = formatAttributes(row.attributes_json);
                return (
                  <div key={row.service_id} style="background: #fff; padding: 12px; display: flex; flex-direction: column; gap: 6px;">
                    {/* 店舗名 */}
                    <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      {row.title}
                    </div>

                    {/* 最寄駅・アクセス情報 */}
                    <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem;">
                      {row.nearestStation ? (
                        <>
                          <span style="background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-weight: 600;">
                            {row.nearestStation.stationName}駅
                          </span>
                          <span style="color: #475569;">
                            {row.access?.text} ({row.access?.distanceText})
                          </span>
                        </>
                      ) : (
                        <span style="color: #94a3b8;">最寄駅情報なし</span>
                      )}
                    </div>

                    {/* 住所とタグ */}
                    <div style="display: flex; align-items: center; gap: 8px; font-size: 0.7rem; color: #64748b;">
                      <span style="flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        {row.address}
                      </span>
                      <div style="display: flex; gap: 4px; flex-shrink: 0;">
                        {tags.map((tag, i) => (
                          <span key={i} style="background: #f1f5f9; padding: 1px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style="background: #fff; padding: 40px; text-align: center; color: #94a3b8; font-size: 0.9rem;">
                該当する店舗が見つかりませんでした。
              </div>
            )}
          </div>

          {/* ページネーション */}
          <div style="margin-top: 24px; display: flex; justify-content: center; align-items: center; gap: 16px;">
            {page > 1 ? (
              <a href={`?q=${encodeURIComponent(q)}&page=${page - 1}`} style="font-size: 0.85rem; color: #3b82f6; text-decoration: none;">← 前の{perPage}件</a>
            ) : (
              <span style="font-size: 0.85rem; color: #cbd5e1;">← 前の{perPage}件</span>
            )}
            
            <span style="font-size: 0.8rem; color: #475569; font-weight: 600;">Page {page}</span>
            
            {total > page * perPage ? (
              <a href={`?q=${encodeURIComponent(q)}&page=${page + 1}`} style="font-size: 0.85rem; color: #3b82f6; text-decoration: none;">次の{perPage}件 →</a>
            ) : (
              <span style="font-size: 0.85rem; color: #cbd5e1;">次の{perPage}件 →</span>
            )}
          </div>
        </main>
      </div>
    );
  } catch (e) {
    console.error(e);
    return c.render(
      <div style="padding: 20px; color: #ef4444; background: #fef2f2; border-radius: 8px; margin: 20px;">
        <strong>Error:</strong> {e instanceof Error ? e.message : '予期せぬエラーが発生しました'}
      </div>
    );
  }
})