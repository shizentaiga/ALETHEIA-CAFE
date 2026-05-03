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
// 座標と市区町村名を同時に取得するため getTowns を使用
const API_BASE_URL = 'https://geoapi.heartrails.com/api/json?method=getTowns';

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
 * 4. 北海道の「市区町村名」→「仮想エリアID」マッピング
 */
const getHokkaidoVirtualId = (cityName: string): string => {
  // 振興局に基づくグルーピング（主要な市町村での簡易判定例）
  const dooh = ['札幌市', '江別市', '千歳市', '恵庭市', '北広島市', '石狩市', '小樽市', '岩見沢市', '夕張市'];
  const donan = ['函館市', '北斗市', '松前郡', '亀田郡', '上磯郡'];
  const dooku = ['旭川市', '留萌市', '稚内市', '士別市', '名寄市', '富良野市'];
  
  if (dooh.some(s => cityName.includes(s))) return '01-V10'; // 道央
  if (donan.some(s => cityName.includes(s))) return '01-V20'; // 道南
  if (dooku.some(s => cityName.includes(s))) return '01-V30'; // 道北
  return '01-V40'; // 道東（その他）
};

const fetchTowns = async (prefName: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}&prefecture=${encodeURIComponent(prefName)}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json() as any;
    return data.response.location || [];
  } catch (error) {
    console.error(`❌ Failed to fetch ${prefName}:`, error);
    return [];
  }
};

const main = async () => {
  let sql = `-- ALETHEIA Areas Master Data (Auto Generated)\n`;
  sql += `-- Generated at: ${new Date().toLocaleString()}\n`;
  sql += `DELETE FROM areas;\n\n`;

  // --- Step 1 & 2: Level 1 (Regions) & Level 2 (Prefectures) ---
  for (const region of REGION_DEFINITIONS) {
    sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level) VALUES ('${region.id}', '${region.name}', 1);\n`;

    if (region.key === 'hokkaido') {
      const vAreas = [
        { id: '01-V10', name: '道央' }, { id: '01-V20', name: '道南' },
        { id: '01-V30', name: '道北' }, { id: '01-V40', name: '道東' },
      ];
      for (const va of vAreas) {
        sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level) VALUES ('${va.id}', '${va.name}', 2);\n`;
      }
    } else {
      const prefsInRegion = JP_REGIONS[region.key as keyof typeof JP_REGIONS] || [];
      for (const prefName of prefsInRegion) {
        const jisCode = Object.entries(PREFECTURE_MASTER).find(
          ([key, value]) => value === prefName && /^\d{2}$/.test(key)
        )?.[0];
        if (jisCode) {
          sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level) VALUES ('${region.id}-${jisCode}', '${prefName}', 2);\n`;
        }
      }
    }
  }

  // --- Step 3: Level 3 (Cities) ---
  sql += `\n-- Level 3: Cities (HeartRails API with A-Code)\n`;

  for (const region of REGION_DEFINITIONS) {
    const prefsInRegion = JP_REGIONS[region.key as keyof typeof JP_REGIONS] || [];
    console.log(`📡 Start fetching Region: ${region.name}`);

    for (const prefName of prefsInRegion) {
      const rawTowns = await fetchTowns(prefName);
      
      // 1段目: 市区町村単位でユニーク化 (名前をキーに座標を保持)
      const cityMap = new Map<string, { x: number, y: number }>();
      for (const t of rawTowns) {
        if (!cityMap.has(t.city)) {
          cityMap.set(t.city, { x: t.x, y: t.y });
        }
      }

      console.log(`   - ${prefName}: ${cityMap.size} cities identified.`);

      // 2段目: 独自コード(A001...)を採番してSQL生成
      let cityCounter = 1;
      const jisCode = Object.entries(PREFECTURE_MASTER).find(
        ([key, value]) => value === prefName && /^\d{2}$/.test(key)
      )?.[0];

      for (const [cityName, coords] of cityMap.entries()) {
        const aCode = `A${String(cityCounter).padStart(3, '0')}`;
        let parentId = `${region.id}-${jisCode}`;

        if (region.key === 'hokkaido') {
          parentId = getHokkaidoVirtualId(cityName);
        }

        const areaId = `${parentId}-${aCode}`;
        const escapedCityName = cityName.replace(/'/g, "''");

        sql += `INSERT OR REPLACE INTO areas (area_id, name, area_level, lat, lng) VALUES ('${areaId}', '${escapedCityName}', 3, ${coords.y}, ${coords.x});\n`;
        cityCounter++;
      }
      
      // API負荷軽減
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, sql);

  console.log(`\n✅ Successfully generated SQL at: ${OUTPUT_PATH}`);
};

main().catch(err => {
  console.error("❌ Error during SQL generation:", err);
  process.exit(1);
});