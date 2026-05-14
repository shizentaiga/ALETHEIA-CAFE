// 実行コマンド: npx tsx scripts/geo/station_google_optimize.ts

// 出力先：src/db/seed/00_master/stations_13_tokyo.sql

/** 
 * 設計メモ：東京都限定
 * 
 * ①DBにアクセス
 * 推奨形式:
 * ${address} ${line_name} ${station_name}駅
 * （例：東京都港区新橋二丁目17 JR東海道本線 新橋駅）
 * 
 * ②東京都限定でフィルター(APIリソース節約)
 * 
 * ③件数を上限を設定：300件くらい(無限ループを防止)
 * 
 * ④SQL文を作成(Google APIより、緯度と経度のみをアップデートするもの)
 * テーブル名=stationsで、主キー=station_cdで、
 *  lon          REAL NOT NULL,    -- 経度 (X) ※システム内では 'lng' として扱う
 *  lat          REAL NOT NULL,    -- 緯度 (Y)
 * 上記のみを変更するSQL文を作成する。(アップデート文)
*/

import { Miniflare } from "miniflare";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const LIMIT = 1000; // テスト時は10。本番時は適宜変更(東京都は943件)
const PREF_CD = 13; // 東京都
const OUTPUT_FILE = path.resolve(process.cwd(), 'src/db/seed/00_master/stations_13_tokyo.sql');

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const envPath = path.resolve(process.cwd(), '.dev.vars');
if (!fs.existsSync(envPath)) {
  console.error('.dev.vars file not found');
  process.exit(1);
}
const env = dotenv.parse(fs.readFileSync(envPath));
const API_KEY = env.GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.error('GOOGLE_MAPS_API_KEY is not defined in .dev.vars');
  process.exit(1);
}

const mf = new Miniflare({
  d1Databases: { ALETHEIA_CAFE_DB: "70ed05d4-20d7-484d-bdc1-3a5e9ea63086" },
  modules: true,
  script: `export default { fetch: () => new Response("ok") }`,
  d1Persist: ".wrangler/state/v3/d1",
});

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchGeocode(query: string, key: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`;
  const response = await fetch(url);
  return await response.json() as any;
}

async function main() {
  const db = await mf.getD1Database("ALETHEIA_CAFE_DB");

  const countRes = await db.prepare(`
    SELECT COUNT(*) as total FROM stations WHERE pref_cd = ? AND e_status = 0
  `).bind(PREF_CD).first() as { total: number };
  
  const totalInPref = countRes?.total || 0;
  console.log(`📊 Statistics: 東京都(pref_cd:${PREF_CD}) Total = ${totalInPref}件, LIMIT = ${LIMIT}件`);
  console.log(`🚀 Starting optimization (Priority: Station Center)...`);

  const { results } = await db.prepare(`
    SELECT 
      s.station_cd, 
      s.station_name, 
      s.address, 
      s.lat as old_lat,
      s.lon as old_lon,
      l.line_name 
    FROM stations s
    JOIN lines l ON s.line_cd = l.line_cd
    WHERE s.pref_cd = ? AND s.e_status = 0
    LIMIT ?
  `).bind(PREF_CD, LIMIT).all();

  if (!results || results.length === 0) {
    console.log("No stations found.");
    return;
  }

  const sqlStatements: string[] = [
    "-- Google Maps API Optimized Coordinates (Station Center Focus)", 
    `-- Generated at: ${new Date().toLocaleString()}`,
    `-- Pref_CD: ${PREF_CD}, Target: ${results.length} / Total: ${totalInPref}`,
    "-- Note: 'lon' column is used for Longitude (lng)",
    ""
  ];

  let successCount = 0;
  process.stdout.write("Progress: ");

  for (let i = 0; i < results.length; i++) {
    const row = results[i] as any;
    const { station_cd, station_name, address, line_name, old_lat, old_lon } = row;

    const cleanLineName = line_name.replace(/\（.*?\）|\(.*?\)/g, '');

    // 【重要】住所から番地を除外し、市区町村名までを抽出
    // 例: "東京都江戸川区南小岩７丁目" -> "江戸川区"
    const cityMatch = address.match(/.*?(?:市|区|町|村)/);
    const cityName = cityMatch ? cityMatch[0] : "東京都";

    // クエリを「駅そのもの」を狙う形に変更
    // 例: "日本、江戸川区 小岩駅 総武線"
    let currentQuery = `日本、${cityName} ${station_name}駅 ${cleanLineName}`;
    
    try {
      let data = await fetchGeocode(currentQuery, API_KEY);

      if (data.status === 'OK') {
        let { lat, lng } = data.results[0].geometry.location;
        let formattedAddr = data.results[0].formatted_address;
        let dist = getDistance(old_lat, old_lon, lat, lng);

        // ⚠️ 距離が1.0km以上離れている場合のみ再試行
        if (dist > 1.0) {
          const retryQuery = `日本、東京都 ${station_name}駅`;
          const retryData = await fetchGeocode(retryQuery, API_KEY);

          if (retryData.status === 'OK') {
            const rLat = retryData.results[0].geometry.location.lat;
            const rLng = retryData.results[0].geometry.location.lng;
            const rDist = getDistance(old_lat, old_lon, rLat, rLng);

            if (rDist < dist) {
              lat = rLat;
              lng = rLng;
              dist = rDist;
              formattedAddr = retryData.results[0].formatted_address;
              currentQuery = retryQuery;
            }
          }
        }

        let alertMarker = "";
        if (dist > 1.0) {
          process.stdout.write("\n");
          console.warn(`⚠️  Warning [${station_cd} ${station_name}]: Distance still ${dist.toFixed(2)}km away.`);
          alertMarker = ` -- ⚠️ CHECK DISTANCE: ${dist.toFixed(2)}km`;
        }

        const sql = `UPDATE stations SET lat = ${lat}, lon = ${lng} WHERE station_cd = ${station_cd}; -- ${station_name} (${formattedAddr})${alertMarker}`;
        sqlStatements.push(sql);
        successCount++;
      } else {
        process.stdout.write("\n");
        console.warn(`⚠️  Skip [${station_cd} ${station_name}]: API Status ${data.status}`);
      }

      if ((i + 1) % 10 === 0) {
        process.stdout.write(".");
        if ((i + 1) % 100 === 0) process.stdout.write(` (${i + 1})\nProgress: `);
      }

      await sleep(150);

    } catch (error) {
      process.stdout.write("\n");
      console.error(`❌ Error [${station_name}]:`, error);
    }
  }

  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, sqlStatements.join('\n'), 'utf-8');
  console.log(`\n\n✅ Done! Optimized ${successCount}/${results.length} stations.`);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});