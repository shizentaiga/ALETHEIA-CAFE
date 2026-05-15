// src/db/queries/stationQuery.ts

import { getBoundingBox, calculateDistance } from '../../lib/geoUtils';

export type StationCandidate = {
  stationName: string; // 駅名
  distance: number;    // 直線距離(m)
  lat: number;
  lng: number;         // 💡 lonからlngへ変換済み
  lines: string[];     // 乗り入れ路線リスト
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
  // インデックスを効かせるため、共通関数で約5km圏内の境界値を算出
  const { minLat, maxLat, minLng, maxLng } = getBoundingBox(lat, lng, 5);

  // station_g_cdを取得し同名駅を識別(💡DBのlonをlngとして扱う)
  const { results } = await db.prepare(`
    SELECT s.station_g_cd, s.station_name, s.lat, s.lon AS lng, l.line_name
    FROM stations s
    JOIN lines l ON s.line_cd = l.line_cd
    WHERE s.lat BETWEEN ?1 AND ?2
      AND s.lon BETWEEN ?3 AND ?4
      AND s.e_status = 0
  `).bind(minLat, maxLat, minLng, maxLng).all();

  if (!results || results.length === 0) return [];

  // --- 2. & 3. 【精密距離計算 & 駅名グループ化】 ---
  // station_g_cdをキーとし、同一駅の複数路線を集約
  const stationMap = new Map<number, StationCandidate>();

  for (const row of results as any[]) {
    const gCd = row.station_g_cd;
    
    if (stationMap.has(gCd)) {
      const existing = stationMap.get(gCd)!;
      if (!existing.lines.includes(row.line_name)) {
        existing.lines.push(row.line_name);
      }
      continue;
    }

    // 共通関数(Haversine公式)で精密な距離を算出
    const distance = Math.round(calculateDistance(lat, lng, row.lat, row.lng));

    stationMap.set(gCd, {
      stationName: row.station_name,
      distance: distance,
      lat: row.lat,
      lng: row.lng,
      lines: [row.line_name]
    });
  }

  // --- 4. 【ソートと抽出】 ---
  // 近い順に並び替え、上位N件を返却
  return Array.from(stationMap.values())
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
};