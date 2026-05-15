// scripts/000-01-10_gen_areas.ts
// 実行コマンド: npx tsx scripts/000-01-10_gen_areas.ts
// 出力先：src/db/seed/00_master/01-10_areas_master.sql

import * as fs from 'fs';
import path from 'path';
import { JP_REGIONS, PREFECTURE_MASTER } from '../src/lib/constants';

/**
 * [設計思想]
 * 1. 階層構造: 全国を「地方(L1) > 都道府県/仮想エリア(L2) > 市区町村(L3)」の最大3階層で固定。
 * 2. ID体系: ALETHEIA独自コード（A+連番）を採用し、JISコードの有無に依存しない網羅性を確保。
 * 3. 座標管理: L3（市区町村）は店舗検索の実用性を考慮し、HeartRails APIから取得した代表点を保持。
 * 4. 特殊処理: 北海道の広大さを考慮し、独自の仮想エリア（道央・道南等）へL3を振り分ける。
 */

const OUTPUT_PATH = 'src/db/seed/00_master/01-10_areas_master.sql';
const API_CITIES = 'https://geoapi.heartrails.com/api/json?method=getCities';
const API_TOWNS = 'https://geoapi.heartrails.com/api/json?method=getTowns';

/**
 * HeartRails API Response Type Definitions
 */
interface HeartRailsResponse {
  response: {
    location?: Array<{
      city?: string;
      x?: number;
      y?: number;
    }>;
    error?: string;
  };
}

/**
 * 1. 大エリア（Level 1）の定義データ
 * ID体系: '地方コード2桁' (例: '01' 北海道, '10' 関東)
 * 日本全体を地方単位で大きく区切る役割。
 */
const REGION_DEFINITIONS = [
  { id: '01', name: '北海道', key: 'hokkaido' },
  { id: '02', name: '東北',   key: 'tohoku' },
  { id: '10', name: '関東',   key: 'kanto' },
  { id: '20', name: '中部',   key: 'chubu' },
  { id: '30', name: '近畿',   key: 'kinki' },
  { id: '40', name: '中国',   key: 'chugoku' },
  { id: '50', name: '四国',   key: 'shikoku' },
  { id: '60', name: '九州・沖縄',   key: 'kyushu' },
];

/**
 * 4. 特殊処理：北海道の「振興局・仮想エリア」マッピング
 * 役割: 北海道の179市町村を「道央・道北・道東・道南」等の仮想L2へ振り分ける。
 * 実装: getTownsで取得した市区町村名をキーに、所属先の仮想エリアIDを判定。
 */
const getHokkaidoVirtualId = (cityName: string): string => {
  const dooh = ['札幌', '江別', '千歳', '恵庭', '北広島', '石狩', '小樽', '岩見沢', '夕張', '空知', '石狩', '後志', '胆振', '日高'];
  const donan = ['函館', '北斗', '渡島', '檜山'];
  const dooku = ['旭川', '留萌', '稚内', '士別', '名寄', '富良野', '上川', '宗谷'];
  
  if (dooh.some(s => cityName.includes(s))) return '01-V10';
  if (donan.some(s => cityName.includes(s))) return '01-V20';
  if (dooku.some(s => cityName.includes(s))) return '01-V30';
  return '01-V40';
};

/**
 * 型安全なリトライ付きFetch
 */
const fetchWithRetry = async (url: string, retries = 3): Promise<HeartRailsResponse['response'] | null> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        await new Promise(r => setTimeout(r, 5000 * (i + 1)));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = (await response.json()) as HeartRailsResponse;
      return data.response;
    } catch (error) {
      if (i === retries - 1) return null;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return null;
};

const main = async () => {
  let sql = `-- ALETHEIA Areas Master Data\n-- Source: HeartRails GeoAPI\n-- Generated: ${new Date().toLocaleString()}\nDELETE FROM areas;\n\n`;

  console.log("🚀 Starting Precise Area Generation...");

  // --- 1. L1 (Region) & 2. L2 (Prefecture) の静的生成 ---
  // L1/L2 座標データの扱い: 広域エリアのため lat/lng は NULL（実用性が低いため）
  for (const region of REGION_DEFINITIONS) {
    // 大エリア（Level 1）の出力
    sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level) VALUES ('${region.id}', '${region.name}', 1);\n`;
    
    if (region.key === 'hokkaido') {
      // 中エリア（Level 2）: 北海道内の仮想エリアID体系 '01-V+連番'
      ['道央', '道南', '道北', '道東'].forEach((name, i) => {
        sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level) VALUES ('01-V${(i+1)*10}', '${name}', 2);\n`;
      });
    } else {
      // 中エリア（Level 2）: 通常県 ID体系 '地方ID-都道府県JIS2桁'
      const prefs = JP_REGIONS[region.key as keyof typeof JP_REGIONS] || [];
      for (const prefName of prefs) {
        const jisCode = Object.entries(PREFECTURE_MASTER).find(([k, v]) => v === prefName && /^\d{2}$/.test(k))?.[0];
        if (jisCode) sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level) VALUES ('${region.id}-${jisCode}', '${prefName}', 2);\n`;
      }
    }
  }

  // --- 3. L3 (City) の動的生成 ---
  // ID体系: '中エリアID-A+連番3桁' (例: '10-13-A001')
  // 「A」は ALETHEIA 独自コードであることを示し、全自治体の網羅を担保する。
  let totalCities = 0;

  for (const region of REGION_DEFINITIONS) {
    const prefs = JP_REGIONS[region.key as keyof typeof JP_REGIONS] || [];

    for (const prefName of prefs) {
      console.log(`📡 Fetching Cities: ${prefName}...`);
      const response = await fetchWithRetry(`${API_CITIES}&prefecture=${encodeURIComponent(prefName)}`);
      
      const locations = response?.location || [];
      const cityNames = locations.map(loc => loc.city).filter((c): c is string => !!c);

      if (cityNames.length === 0) {
        console.warn(`    ⚠️ No cities found for ${prefName}.`);
        continue;
      }

      const jisCode = Object.entries(PREFECTURE_MASTER).find(([k, v]) => v === prefName && /^\d{2}$/.test(k))?.[0];
      let cityCounter = 1;

      for (const cityName of cityNames) {
        // 5. 座標データの取得: HeartRails API (getTowns) から市区町村の代表点を取得
        // データ抑制のため町域名（新宿三丁目等）は含めず、最初の町域の座標を採用。
        const townRes = await fetchWithRetry(`${API_TOWNS}&prefecture=${encodeURIComponent(prefName)}&city=${encodeURIComponent(cityName)}`);
        const firstTown = townRes?.location?.[0];

        if (firstTown && firstTown.x !== undefined && firstTown.y !== undefined) {
          const aCode = `A${String(cityCounter).padStart(3, '0')}`;
          
          // 北海道の場合は前述の判定に基づき親IDを差し替える（仮想L2マッピング）
          const parentId = region.key === 'hokkaido' ? getHokkaidoVirtualId(cityName) : `${region.id}-${jisCode}`;
          const areaId = `${parentId}-${aCode}`;

          // 6. SQL出力フォーマット: INSERT OR REPLACE 形式
          // 文字列エスケープ（' -> ''）を徹底し、SQLエラーを防止。
          sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level, lat, lng) VALUES ('${areaId}', '${cityName.replace(/'/g, "''")}', 3, ${firstTown.y}, ${firstTown.x});\n`;
          cityCounter++;
          totalCities++;
        }
        
        // 自治体ごとの待機（API制限回避）
        await new Promise(r => setTimeout(r, 200));
      }
      console.log(`    ✅ ${prefName}: ${cityCounter - 1} cities added.`);
      // 都道府県ごとの待機
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // 保存処理
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, sql);

  console.log(`\n==================================================`);
  console.log(`🎉 COMPLETED!`);
  console.log(`Total Level 3 Cities: ${totalCities}`);
  console.log(`File saved to: ${OUTPUT_PATH}`);
  console.log(`==================================================`);
};

main().catch(console.error);