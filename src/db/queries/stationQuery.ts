// src/db/queries/stationQuery.ts

import { getBoundingBox, calculateDistance } from '../../lib/geoUtils';

export type StationCandidate = {
  stationName: string; // 駅名（例: "新宿"）
  distance: number;    // 計算された直線距離(m)
  lat: number;
  lng: number; // 💡 lon から lng に変更
  lines: string[];     // その駅に乗り入れている路線名のリスト
};

/**
 * 座標から周辺駅を検索し、近い順にグループ化して返す
 */
export const calculateNearestStations = async (
  db: D1Database,
  lat: number,
  lng: number,
  limit: number = 3
): Promise<StationCandidate[]> => {

  // --- 1. 【範囲絞り込み】 ---
  // 約5km圏内 (10km四方の枠) を共通関数で計算
  const { minLat, maxLat, minLng, maxLng } = getBoundingBox(lat, lng, 5);

  // 同名駅の対策として station_g_cd を取得(💡 DBの lon を lng として扱うよう変更)
  const { results } = await db.prepare(`
    SELECT s.station_g_cd, s.station_name, s.lat, s.lon AS lng, l.line_name
    FROM stations s
    JOIN lines l ON s.line_cd = l.line_cd
    WHERE s.lat BETWEEN ?1 AND ?2
      AND s.lon BETWEEN ?3 AND ?4 -- 💡 DBカラム名は lon のままでOK
      AND s.e_status = 0
  `).bind(minLat, maxLat, minLng, maxLng).all();

  if (!results || results.length === 0) return [];

  // --- 2. & 3. 【精密距離計算 & 駅名グループ化】 ---
  // Mapのキー： station_g_cd (数値) によって、駅名の重複による混同を防止
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

    // 新規駅グループの場合は距離計算(Haversine公式)
    const distance = Math.round(calculateDistance(lat, lng, row.lat, row.lng));

    stationMap.set(gCd, {
      stationName: row.station_name,
      distance: distance,
      lat: row.lat,
      lng: row.lng,
      lines: [row.line_name]
    });
  }

  // --- 4. 【ソート】 ---
  // 距離が近い順に並び替えて、上位N件(引数のlimit)の駅グループを抽出
  return Array.from(stationMap.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
};
