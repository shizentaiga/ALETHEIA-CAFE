// src/db/queries/stationQuery.ts

export type StationCandidate = {
  stationName: string; // 駅名（例: "新宿"）
  distance: number;    // 計算された直線距離(m)
  lat: number;
  lon: number;
  lines: string[];     // その駅に乗り入れている路線名のリスト
};

/**
 * 座標から周辺駅を検索し、近い順にグループ化して返す
 */
export const calculateNearestStations = async (
  db: D1Database,
  lat: number,
  lon: number,
  limit: number = 3
): Promise<StationCandidate[]> => {
  // --- 1. 【範囲絞り込み】 ---
  // D1の計算負荷を下げるため、インデックスが効く単純な数値比較(BETWEEN)を使用。
  // 約2km圏内を検索対象とする (1度 ≒ 111km なので 2km ≒ 0.018度)
  const range = 0.018; 
  const minLat = lat - range;
  const maxLat = lat + range;
  const minLon = lon - range;
  const maxLon = lon + range;

  // 修正点: 同名駅（別場所）対策として station_g_cd を取得に追加
  const { results } = await db.prepare(`
    SELECT 
      s.station_g_cd,
      s.station_name,
      s.lat,
      s.lon,
      l.line_name
    FROM stations s
    JOIN lines l ON s.line_cd = l.line_cd
    WHERE s.lat BETWEEN ?1 AND ?2
      AND s.lon BETWEEN ?3 AND ?4
      AND s.e_status = 0
  `).bind(minLat, maxLat, minLon, maxLon).all();

  if (!results || results.length === 0) return [];

  // --- 2. & 3. 【精密距離計算 & 駅名グループ化】 ---
  // 修正点: 日本全土での誤差を減らすため、入力緯度に基づいて経度1度あたりの距離を補正
  // 緯度が高くなるほど経度1度あたりの距離は短くなるため Math.cos を使用
  const M_PER_LAT = 111111;
  const mPerLon = Math.cos(lat * Math.PI / 180) * 111320; 

  // 修正点: Mapのキーを station_name から station_g_cd (数値) に変更
  // これにより、離れた場所にある同名の「市役所前駅」などが混同されるのを防ぐ
  const stationMap = new Map<number, StationCandidate>();

  for (const row of results as any[]) {
    const gCd = row.station_g_cd;
    
    // 同一駅グループ（station_g_cdが同じ）が既にMapにある場合は、路線リストに追加
    if (stationMap.has(gCd)) {
      const existing = stationMap.get(gCd)!;
      if (!existing.lines.includes(row.line_name)) {
        existing.lines.push(row.line_name);
      }
      continue;
    }

    // 新規駅グループの場合は距離計算
    // 三平方の定理に動的な経度補正を適用
    const dy = (lat - row.lat) * M_PER_LAT;
    const dx = (lon - row.lon) * mPerLon;
    const distance = Math.round(Math.sqrt(dx * dx + dy * dy));

    stationMap.set(gCd, {
      stationName: row.station_name,
      distance: distance,
      lat: row.lat,
      lon: row.lon,
      lines: [row.line_name]
    });
  }

  // --- 4. & 5. 【ソートとフィルタリング & 戻り値の生成】 ---
  // 計算された距離が近い順に並び替え
  // 引数のlimitに基づき、上位N件の駅グループを抽出
  return Array.from(stationMap.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
};