// scripts/000_gen_areas.ts
// 実行コマンド: npx tsx scripts/000_gen_areas.ts
// 出力先：src/db/seed/00_master/areas.sql

/**
 * 1. 大エリア（Level 1）の定義と出力
 * -----------------------------------------------------------------------------
 * ID体系: '地方コード2桁' (例: '01' 北海道, '10' 関東)
 * 役割: 日本全体を地方単位で大きく区切る
 * 実装: 固定配列（北から順）に基づいて生成。lat/lngはNULL。
 */

/**
 * 2. 中エリア（Level 2）の取得と出力
 * -----------------------------------------------------------------------------
 * ID体系: 
 * - 通常県: '地方ID-都道府県JIS2桁' (例: '10-13' 東京都)
 * - 北海道内の仮想エリア: '地方ID-V+連番' (例: '01-V10' 道央)
 * 役割: ドリルダウン検索の第2ステップ。階層構造の統一（全国最大3階層固定）。
 */

/**
 * 3. 小エリア（Level 3）の取得と出力
 * -----------------------------------------------------------------------------
 * ID体系: '中エリアID-A+連番3桁' (例: '10-13-A001' 新宿区, '01-V10-A001' 小樽市)
 * 採番ルール: 
 * - HeartRails API (getTowns) から取得した市区町村をユニーク化し、出現順に A001, A002... と採番。
 * - 「A」は ALETHEIA 独自コードであることを示す。
 * データソース: HeartRails API (getTowns) ※市区町村名と代表座標を同時に取得するため
 * スコープ定義:
 * - 「市区町村」単位で集約。町域名（新宿三丁目等）はデータ量抑制のため含めない。
 */

/**
 * 4. 特殊処理：北海道の「振興局・仮想エリア」マッピング
 * -----------------------------------------------------------------------------
 * 役割: 北海道の179市町村を「道央・道北・道東・道南」等の仮想L2へ振り分ける。
 * 実装: 
 * - getTowns で取得した市区町村名（city）をキーに、所属先の仮想エリアIDを判定する定数を用意。
 * - 市区町村(L3)生成時、親ID（Level 2）をこの判定に基づいて動的に差し替える。
 */

/**
 * 5. 座標データの扱い
 * -----------------------------------------------------------------------------
 * L3（市区町村）: 
 * - getTowns APIで取得したリストの「最初の町域」が持つ x, y を代表点として採用。
 * L1・L2（広域エリア）: 
 * - 代表点を持たない（NULL）。店舗検索において広域の中心点は実用性が低いため。
 */

/**
 * 6. SQL出力フォーマット
 * -----------------------------------------------------------------------------
 * 形式: INSERT OR REPLACE INTO areas (area_id, name, area_level, lat, lng) VALUES (...)
 * 考慮事項:
 * - 文字列エスケープ（' -> ''）の徹底。
 * - Aコードによる採番により、JISコード未取得によるスキップを防止し、全自治体を網羅する。
 */

// scripts/000_gen_areas.ts
import * as fs from 'fs';
import path from 'path';
import { JP_REGIONS, PREFECTURE_MASTER } from '../src/lib/constants';

const OUTPUT_PATH = 'src/db/seed/00_master/areas.sql';
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
 * 北海道の仮想エリア（道央・道南・道北・道東）への振り分けロジック
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
      
      // 型アサーションにより unknown 型エラーを回避
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

  // --- L1 (Region) & L2 (Prefecture) の静的生成 ---
  for (const region of REGION_DEFINITIONS) {
    sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level) VALUES ('${region.id}', '${region.name}', 1);\n`;
    if (region.key === 'hokkaido') {
      ['道央', '道南', '道北', '道東'].forEach((name, i) => {
        sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level) VALUES ('01-V${(i+1)*10}', '${name}', 2);\n`;
      });
    } else {
      const prefs = JP_REGIONS[region.key as keyof typeof JP_REGIONS] || [];
      for (const prefName of prefs) {
        const jisCode = Object.entries(PREFECTURE_MASTER).find(([k, v]) => v === prefName && /^\d{2}$/.test(k))?.[0];
        if (jisCode) sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level) VALUES ('${region.id}-${jisCode}', '${prefName}', 2);\n`;
      }
    }
  }

  // --- L3 (City) の動的生成 ---
  let totalCities = 0;

  for (const region of REGION_DEFINITIONS) {
    const prefs = JP_REGIONS[region.key as keyof typeof JP_REGIONS] || [];

    for (const prefName of prefs) {
      console.log(`📡 Fetching Cities: ${prefName}...`);
      const response = await fetchWithRetry(`${API_CITIES}&prefecture=${encodeURIComponent(prefName)}`);
      
      const locations = response?.location || [];
      const cityNames = locations.map(loc => loc.city).filter((c): c is string => !!c);

      if (cityNames.length === 0) {
        console.warn(`   ⚠️ No cities found for ${prefName}.`);
        continue;
      }

      const jisCode = Object.entries(PREFECTURE_MASTER).find(([k, v]) => v === prefName && /^\d{2}$/.test(k))?.[0];
      let cityCounter = 1;

      for (const cityName of cityNames) {
        // 各自治体の代表座標を取得
        const townRes = await fetchWithRetry(`${API_TOWNS}&prefecture=${encodeURIComponent(prefName)}&city=${encodeURIComponent(cityName)}`);
        const firstTown = townRes?.location?.[0];

        if (firstTown && firstTown.x !== undefined && firstTown.y !== undefined) {
          const aCode = `A${String(cityCounter).padStart(3, '0')}`;
          const parentId = region.key === 'hokkaido' ? getHokkaidoVirtualId(cityName) : `${region.id}-${jisCode}`;
          const areaId = `${parentId}-${aCode}`;

          sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level, lat, lng) VALUES ('${areaId}', '${cityName.replace(/'/g, "''")}', 3, ${firstTown.y}, ${firstTown.x});\n`;
          cityCounter++;
          totalCities++;
        }
        
        // 自治体ごとの待機（API制限回避）
        await new Promise(r => setTimeout(r, 200));
      }
      console.log(`   ✅ ${prefName}: ${cityCounter - 1} cities added.`);
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