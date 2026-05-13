// src/db/queries/areaQuery.ts

import { D1Database } from '@cloudflare/workers-types'

/**
 * Areaテーブルの型定義
 */
export interface AreaRecord {
  area_id: string;
  name: string;
  area_level: number;
  lat?: number;
  lng?: number;
  created_at?: string;
}

/**
 * 【エリア取得】特定の親IDに紐づく直下の子階層リストを取得する
 */
export const getSubAreas = async (db: D1Database, parentId: string | null) => {
  if (!parentId) {
    // 初期状態：Level 1 (地方) をすべて取得
    const { results } = await db
      .prepare('SELECT area_id, name, area_level FROM areas WHERE area_level = 1 ORDER BY area_id ASC')
      .all<AreaRecord>();
    return { results };
  }

  // 親の情報を取得して、その一つ下のレベルを特定する
  const parent = await getAreaInfo(db, parentId);
  if (!parent) return { results: [] };

  const targetLevel = parent.area_level + 1;
  
  // インデックスを確実に効かせるため、結合済みの文字列を渡す
  // 例: '10' -> '10-%'
  const likePattern = `${parentId}-%`;

  const { results } = await db
    .prepare('SELECT area_id, name, area_level FROM areas WHERE area_id LIKE ? AND area_level = ? ORDER BY area_id ASC')
    .bind(likePattern, targetLevel)
    .all<AreaRecord>();

  return { results };
}

/**
 * 【最寄りエリア特定】指定された座標から最短距離にある Level 3 (市区町村) を1件取得する
 */
export const getNearestCityArea = async (db: D1Database, lat: number, lng: number) => {
  // パフォーマンス最適化：バウンディングボックスによる絞り込み (約1度 ≒ 約111km)
  // 全件ソートを避け、インデックス(idx_services_geo)を有効活用する
  const delta = 1.0;
  const minLat = lat - delta;
  const maxLat = lat + delta;
  const minLng = lng - delta;
  const maxLng = lng + delta;

  return await db
    .prepare(`
      SELECT area_id, name, area_level, lat, lng
      FROM areas 
      WHERE area_level = 3 
      AND (lat BETWEEN ? AND ?)
      AND (lng BETWEEN ? AND ?)
      ORDER BY ((lat - ?) * (lat - ?)) + ((lng - ?) * (lng - ?)) ASC 
      LIMIT 1
    `)
    .bind(minLat, maxLat, minLng, maxLng, lat, lat, lng, lng)
    .first<AreaRecord>();
}

/**
 * 【親エリア情報取得】指定された area_id 自体の情報を取得する
 */
export const getAreaInfo = async (db: D1Database, areaId: string) => {
  return await db
    .prepare('SELECT area_id, name, area_level FROM areas WHERE area_id = ?')
    .bind(areaId)
    .first<AreaRecord>();
}

/**
 * CDNのリージョンコード(JIS)から、DB上の大エリア・中エリア情報を特定する
 */
export async function resolveAreaByRegionCode(db: D1Database, regionCode: string) {
  // 中エリア(L2)の特定
  const l2Area = await db.prepare(
    "SELECT area_id, name FROM areas WHERE area_level = 2 AND area_id LIKE ?"
  ).bind(`%-${regionCode}`).first<{ area_id: string; name: string }>();

  if (!l2Area) return null;

  // 大エリア(L1)のID抽出と名称取得
  const l1Id = l2Area.area_id.split('-')[0];
  const l1Area = await db.prepare(
    "SELECT name FROM areas WHERE area_id = ? AND area_level = 1"
  ).bind(l1Id).first<{ name: string }>();

  return {
    l1Id,
    l1Name: l1Area?.name || '不明',
    l2Id: l2Area.area_id,
    l2Name: l2Area.name
  };
}