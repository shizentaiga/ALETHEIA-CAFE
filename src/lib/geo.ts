// src/lib/geo.ts

import { Context } from 'hono'
import { getPrefectureName } from './constants'

/**
 * Resolve the most appropriate area (prefecture name) from the request.
 * Priority: 1. URL query parameters, 2. CDN (Cloudflare) location data.
 */
export const resolveDetectionArea = (c: Context): string | undefined => {
  // 1. Check URL parameters (?area=...)
  const queryArea = c.req.query('area')
  if (queryArea) return queryArea

  // 2. Fallback to CDN (Cloudflare Workers) geolocation data
  // const cf = (c.req.raw as any).cf
  // if (cf?.country === 'JP' && cf.regionCode) {
  //   return getPrefectureName(cf.regionCode) || undefined
  // }

  return undefined
}

/**
 * Yahoo!ジオコーダAPIを使用して住所から座標を取得する
 * @param address 検索したい住所文字列
 * @param clientId Yahoo! JAPAN デベロッパーネットワークのClient ID
 * @returns 緯度・経度のオブジェクト、取得失敗時はnull
 */
export const fetchCoordinatesFromYahoo = async (
  address: string, 
  clientId: string
): Promise<{ lat: number; lon: number; formattedAddress: string } | null> => {
  if (!address || !clientId) return null;

  try {
    const endpoint = `https://map.yahooapis.jp/geocode/V1/geoCoder`;
    const params = new URLSearchParams({
      appid: clientId,
      query: address,
      output: 'json',
      results: '1', // 最も精度の高い1件のみ取得
    });

    // 10秒のタイムアウトを設定
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Yahoo API error: ${response.status}`);
      return null;
    }

    const data = await response.json() as any;

    // 結果が存在するか確認
    if (data.ResultInfo.Count === 0 || !data.Feature || data.Feature.length === 0) {
      return null;
    }

    const feature = data.Feature[0];
    const coordinates = feature.Geometry.Coordinates.split(','); // "経度,緯度" 形式

    return {
      lon: parseFloat(coordinates[0]),
      lat: parseFloat(coordinates[1]),
      formattedAddress: feature.Property.Address
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Yahoo API request timed out');
    } else {
      console.error('Yahoo API fetch error:', error);
    }
    return null;
  }
};