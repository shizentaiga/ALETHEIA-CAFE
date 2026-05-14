/**
 * ドトール データコンバーター (D1エリア参照 & Yahoo Geocoding付きSQL生成)
 * * 使用方法: npx tsx scripts/brands/002-2_doutor_convert.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv'; // .dev.vars 読み込み用
import { Miniflare } from "miniflare";
import { PATHS, CONFIG, ensureDirectory } from '../utils.js';
import { normalizeAddress } from '../../src/lib/searchUtils.js';
import { fetchCoordinatesFromYahoo } from '../../src/lib/geo.js';

/**
 * プロバイダー固有の設定
 */
const CONVERTER_CONFIG = {
    BRAND_ID: 'DOUTOR',
    INPUT_FILE: '002_doutor.json',
    OUTPUT_FILE: '002-1_doutor.sql', // 緯度経度付きの一次出力SQL
    D1_BINDING: 'ALETHEIA_CAFE_DB',
    D1_DATABASE_ID: '70ed05d4-20d7-484d-bdc1-3a5e9ea63086',
    D1_PERSIST_PATH: '.wrangler/state/v3/d1',
    AREA_LEVEL_TARGET: 3,
    PROCESS_LIMIT: 5000, // 実行件数の制限 (本番は5000、テスト時は10などに変更)
    YAHOO_SLEEP_MS: 50   // Yahoo APIのレート制限考慮用
};

// .dev.vars は形式が dotenv と同じなので、dotenv で読み込みます
const envPath = path.resolve(process.cwd(), '.dev.vars');
const env = dotenv.parse(fs.readFileSync(envPath));

/**
 * DBから取得したエリアマスターの型
 */
interface AreaMaster {
    area_id: string;
    name: string;
    normalizedName: string;
}

/**
 * 表示用住所のクレンジング
 */
function cleanDisplayAddress(str: string) {
    if (!str) return '';
    return str.normalize('NFKC')
              .replace(/[‐－ー—]/g, '-') 
              .replace(/\t/g, ' ')
              .replace(/\r?\n/g, ' ')
              .trim();
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * 生のAPIデータをデータベーススキーマ用のSQLに変換します
 */
async function convertToSql(items: any[], areas: AreaMaster[], clientId: string) {
    const sqlStatements: string[] = [];
    const total = items.length;

    console.log(`🚀 Yahoo APIを使用して ${total} 件のレコードを処理中...`);

    for (let i = 0; i < total; i++) {
        const item = items[i];
        const lines = item.rawLines || [];
        const rawName = lines[0] || 'ドトールコーヒーショップ';
        const rawAddr = lines[1] || '';
        const phone = lines[2] || '';
        
        const displayAddress = cleanDisplayAddress(rawAddr);
        const comparisonAddress = normalizeAddress(rawAddr);

        // エリア判定
        const matchedArea = areas.find(area => comparisonAddress.includes(area.normalizedName));
        const areaId = matchedArea ? `'${matchedArea.area_id}'` : 'NULL';

        // --- Yahoo APIによる座標取得 ---
        let latVal = 'NULL';
        let lngVal = 'NULL';
        
        if (clientId && displayAddress) {
            const coords = await fetchCoordinatesFromYahoo(displayAddress, clientId);
            if (coords) {
                latVal = coords.lat.toString();
                lngVal = coords.lng.toString();
            }
            // API制限を考慮した待機
            await sleep(CONVERTER_CONFIG.YAHOO_SLEEP_MS);
        }

        const businessHours = lines.slice(3).map((l: string) => cleanDisplayAddress(l)).join(' / ');
        const storeId = phone ? phone.replace(/-/g, '') : `IDX${i.toString().padStart(5, '0')}`;
        const serviceId = `DTR_${storeId}`;

        // 属性オブジェクトの組み立て
        const attributes = {
            category: "cat_cafe",
            wifi: true,
            phone: phone,
            ext_source: "doutor_official",
            ext_place_id: `DTR_OFFICIAL_${storeId}`,
            business_hours: businessHours || null
        };

        const escapedTitle = rawName.replace(/'/g, "''");
        const escapedAddr = displayAddress.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        const sql = `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.DOUTOR}', '${CONFIG.OWNER_ID}', 'free', ${areaId}, '${escapedTitle}', '${escapedAddr}', ${latVal}, ${lngVal}, '${jsonString}');`;
        sqlStatements.push(sql);

        // 進捗表示
        if ((i + 1) % 10 === 0 || (i + 1) === total) {
            process.stdout.write(`\r⏳ 進捗: ${i + 1} / ${total} 店舗を処理完了...`);
        }
    }
    console.log("\n✅ 変換終了");
    return sqlStatements.join('\n');
}

async function main() {
    console.log("🛠 ドトールの変換処理を開始します...");

    // Miniflare の起動設定
    const mf = new Miniflare({
        d1Databases: { [CONVERTER_CONFIG.D1_BINDING]: CONVERTER_CONFIG.D1_DATABASE_ID },
        modules: true,
        script: `export default { fetch: () => new Response("ok") }`,
        d1Persist: CONVERTER_CONFIG.D1_PERSIST_PATH,
        bindings: {
            YAHOO_MAPS_CLIENT_ID: env.YAHOO_MAPS_CLIENT_ID
        }
    });

    let areas: AreaMaster[] = [];
    try {
        const db = await mf.getD1Database(CONVERTER_CONFIG.D1_BINDING);
        const res = await db.prepare("SELECT area_id, name FROM areas WHERE area_level = ?").bind(CONVERTER_CONFIG.AREA_LEVEL_TARGET).all();
        
        areas = (res.results || []).map((a: any) => ({
            area_id: a.area_id,
            name: a.name,
            normalizedName: normalizeAddress(a.name)
        })).sort((a, b) => b.name.length - a.name.length);
        
        console.log(`✅ ${areas.length} 件のエリアをロードしました。`);
    } catch (error) {
        console.error("❌ エリアマスターの取得に失敗しました。");
        process.exit(1);
    }

    const rawPath = path.join(PATHS.RAW_DATA, CONVERTER_CONFIG.INPUT_FILE);
    if (!fs.existsSync(rawPath)) {
        console.error("❌ 生データが見つかりません:", rawPath);
        return;
    }
    let rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));

    // 件数制限の適用
    if (CONVERTER_CONFIG.PROCESS_LIMIT && rawData.length > CONVERTER_CONFIG.PROCESS_LIMIT) {
        console.log(`⚠️ 処理件数を最初の ${CONVERTER_CONFIG.PROCESS_LIMIT} 件に制限します (合計: ${rawData.length} 件)`);
        rawData = rawData.slice(0, CONVERTER_CONFIG.PROCESS_LIMIT);
    }
    
    // SQL生成実行
    let totalSql = "-- ALETHEIA Doutor Seed (Area-ID Pre-Mapped with Geocoding)\n\n";
    totalSql += await convertToSql(rawData, areas, env.YAHOO_MAPS_CLIENT_ID);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, CONVERTER_CONFIG.OUTPUT_FILE);
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQLシードが生成されました: ${outputPath}`);
    await mf.dispose();
}

main().catch(console.error);