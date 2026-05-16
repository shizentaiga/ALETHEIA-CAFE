/**
 * [File Path] src/routes/sandbox/test15.tsx (または該当のテストルート)
 */
import { Hono } from 'hono'

type Bindings = {
  ALETHEIA_CAFE_DB: D1Database
}

export const test15 = new Hono<{ Bindings: Bindings }>()

// 統計データの型定義
interface AttributeStats {
  total_count: number;
  wifi_count: number;
  outlets_count: number;
  parking_count: number;
  takeout_count: number;
  buffet_count: number;
  pop_buffet_count: number;
  free_refill_count: number;
  baby_count: number;
  // 喫煙ステータス内訳
  smoking_no_smoking: number;
  smoking_room: number;
  smoking_seats: number;
  smoking_all: number;
}

test15.get('/', async (c) => {
  const baseUrl = c.req.path.endsWith('/') ? c.req.path : `${c.req.path}/`;

  // 1. D1(SQLite)のJSON関数を使って、各フラグが true または特定文字列の数を1クエリで爆速集計
  const query = `
    SELECT 
      COUNT(*) as total_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.wifi') = true THEN 1 ELSE 0 END) as wifi_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.outlets') = true THEN 1 ELSE 0 END) as outlets_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.parking') = true THEN 1 ELSE 0 END) as parking_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.takeout') = true THEN 1 ELSE 0 END) as takeout_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.buffet') = true THEN 1 ELSE 0 END) as buffet_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.pop_buffet') = true THEN 1 ELSE 0 END) as pop_buffet_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.free_refill') = true THEN 1 ELSE 0 END) as free_refill_count,
      SUM(CASE WHEN json_extract(attributes_json, '$.baby') = true THEN 1 ELSE 0 END) as baby_count,
      
      -- 喫煙ステータスの集計
      SUM(CASE WHEN json_extract(attributes_json, '$.smoking') = 'NO_SMOKING' THEN 1 ELSE 0 END) as smoking_no_smoking,
      SUM(CASE WHEN json_extract(attributes_json, '$.smoking') = 'SMOKING_ROOM' THEN 1 ELSE 0 END) as smoking_room,
      SUM(CASE WHEN json_extract(attributes_json, '$.smoking') = 'SMOKING_SEATS' THEN 1 ELSE 0 END) as smoking_seats,
      SUM(CASE WHEN json_extract(attributes_json, '$.smoking') = 'ALL_SMOKING' THEN 1 ELSE 0 END) as smoking_all
    FROM services
    WHERE deleted_at IS NULL;
  `;

  let stats: AttributeStats = {
    total_count: 0, wifi_count: 0, outlets_count: 0, parking_count: 0, takeout_count: 0,
    buffet_count: 0, pop_buffet_count: 0, free_refill_count: 0, baby_count: 0,
    smoking_no_smoking: 0, smoking_room: 0, smoking_seats: 0, smoking_all: 0
  };

  try {
    const result = await c.env.ALETHEIA_CAFE_DB.prepare(query).first<AttributeStats>();
    if (result) stats = result;
  } catch (e) {
    console.error('Failed to fetch stats:', e);
  }

  // 表示用のシンプルなテーブルスタイル
  const tableStyle = "width: 100%; max-width: 600px; border-collapse: collapse; margin-top: 20px; font-family: sans-serif;";
  const thStyle = "border-bottom: 2px solid #ddd; padding: 10px; text-align: left; background-color: #f5f5f5;";
  const tdStyle = "border-bottom: 1px solid #ddd; padding: 10px; text-align: left;";

  return c.render(
    <>
      <header>
        <a href={baseUrl} style="text-decoration: none; color: inherit;">
          <h1>ALETHEIA 属性統計アナリティクス</h1>
        </a>
      </header>
      
      <main style="padding: 20px 0;">
        <div style="margin-bottom: 20px; background: #eef7ff; padding: 15px; border-radius: 6px; max-width: 600px;">
          <strong>📊 総データ件数:</strong> {stats.total_count} 件 （アクティブなサービス数）
        </div>

        <h2>🏷️ 動的属性（Attributes）集計結果</h2>
        <p style="color: #666; font-size: 0.9rem;">※この件数を元に、将来的に「食べ放題 ({stats.buffet_count})」のようなサイドバーの絞り込みボタンを生成できます。</p>

        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>属性名 (Key)</th>
              <th style={thStyle}>表示名</th>
              <th style={thStyle}>有効(true)件数</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}><code>buffet</code></td>
              <td style={tdStyle}>ドーナツ食べ放題</td>
              <td style={tdStyle}><strong>{stats.buffet_count}</strong> 件</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>pop_buffet</code></td>
              <td style={tdStyle}>ドーナツポップ詰め放題</td>
              <td style={tdStyle}><strong>{stats.pop_buffet_count}</strong> 件</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>free_refill</code></td>
              <td style={tdStyle}>ドリンクおかわり自由</td>
              <td style={tdStyle}><strong>{stats.free_refill_count}</strong> 件</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>baby</code></td>
              <td style={tdStyle}>赤ちゃんOK/ベビーカー入店</td>
              <td style={tdStyle}><strong>{stats.baby_count}</strong> 件</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>parking</code></td>
              <td style={tdStyle}>専用・提携駐車場あり</td>
              <td style={tdStyle}><strong>{stats.parking_count}</strong> 件</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>outlets</code></td>
              <td style={tdStyle}>コンセント・電源あり</td>
              <td style={tdStyle}><strong>{stats.outlets_count}</strong> 件</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>wifi</code></td>
              <td style={tdStyle}>Wi-Fiあり</td>
              <td style={tdStyle}><strong>{stats.wifi_count}</strong> 件</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>takeout</code></td>
              <td style={tdStyle}>テイクアウト対応</td>
              <td style={tdStyle}><strong>{stats.takeout_count}</strong> 件</td>
            </tr>
          </tbody>
        </table>

        <h2 style="margin-top: 40px;">🚬 喫煙ステータス内訳</h2>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>ステータス値</th>
              <th style={thStyle}>意味</th>
              <th style={thStyle}>件数</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}><code>NO_SMOKING</code></td>
              <td style={tdStyle}>完全禁煙</td>
              <td style={tdStyle}>{stats.smoking_no_smoking} 件</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>SMOKING_ROOM</code></td>
              <td style={tdStyle}>喫煙専用室あり</td>
              <td style={tdStyle}>{stats.smoking_room} 件</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>SMOKING_SEATS</code></td>
              <td style={tdStyle}>喫煙席あり</td>
              <td style={tdStyle}>{stats.smoking_seats} 件</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>ALL_SMOKING</code></td>
              <td style={tdStyle}>全席喫煙可</td>
              <td style={tdStyle}>{stats.smoking_all} 件</td>
            </tr>
          </tbody>
        </table>
      </main>
    </>
  )
})