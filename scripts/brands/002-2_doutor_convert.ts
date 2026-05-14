/**
 * Doutor Data Converter (SQL Generator with D1 Area Lookup & Yahoo Geocoding)
 * 
 * Usage: npx tsx scripts/002-2_doutor_convert.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv'; // .dev.vars 読み込み用
import { Miniflare } from "miniflare";
import { PATHS, CONFIG, ensureDirectory } from '../utils.js';
import { normalizeAddress } from '../../src/lib/searchUtils.js';
import { fetchCoordinatesFromYahoo } from '../../src/lib/geo.js';

// ==========================================
// 実行件数の制限 (テスト時は 10, 本番は 5000 などに変更)
const LIMIT = 5000; 
// ==========================================

// .dev.vars は形式が dotenv と同じなので、dotenv で読み込めます
const envPath = path.resolve(process.cwd(), '.dev.vars');
const env = dotenv.parse(fs.readFileSync(envPath));

interface AreaMaster {
    area_id: string;
    name: string;
    normalizedName: string;
}

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
 * Maps raw API fields to the database schema.
 */
async function convertToSql(items: any[], areas: AreaMaster[], clientId: string) {
    const sqlStatements: string[] = [];
    const total = items.length;

    console.log(`🚀 Processing ${total} records using Yahoo API...`);

    for (let i = 0; i < total; i++) {
        const item = items[i];
        const lines = item.rawLines || [];
        const rawName = lines[0] || 'ドトールコーヒーショップ';
        const rawAddr = lines[1] || '';
        const phone = lines[2] || '';
        
        const displayAddress = cleanDisplayAddress(rawAddr);
        const comparisonAddress = normalizeAddress(rawAddr);

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
            // レート制限考慮
            await sleep(50);
        }

        const businessHours = lines.slice(3).map((l: string) => cleanDisplayAddress(l)).join(' / ');
        const storeId = phone ? phone.replace(/-/g, '') : `IDX${i.toString().padStart(5, '0')}`;
        const serviceId = `DTR_${storeId}`;

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

        if ((i + 1) % 10 === 0 || (i + 1) === total) {
            process.stdout.write(`\r⏳ Progress: ${i + 1} / ${total} stores processed...`);
        }
    }
    console.log("\n✅ Done.");
    return sqlStatements.join('\n');
}

async function main() {
    console.log("🛠 Starting Doutor Conversion...");

    // Miniflare の起動設定に .dev.vars から読み込んだ Client ID を渡す
    const mf = new Miniflare({
        d1Databases: { ALETHEIA_CAFE_DB: "70ed05d4-20d7-484d-bdc1-3a5e9ea63086" },
        modules: true,
        script: `export default { fetch: () => new Response("ok") }`,
        d1Persist: ".wrangler/state/v3/d1",
        bindings: {
            YAHOO_MAPS_CLIENT_ID: env.YAHOO_MAPS_CLIENT_ID // .dev.vars の値
        }
    });

    let areas: AreaMaster[] = [];
    try {
        const db = await mf.getD1Database("ALETHEIA_CAFE_DB");
        const res = await db.prepare("SELECT area_id, name FROM areas WHERE area_level = 3").all();
        
        areas = (res.results || []).map((a: any) => ({
            area_id: a.area_id,
            name: a.name,
            normalizedName: normalizeAddress(a.name)
        })).sort((a, b) => b.name.length - a.name.length);
        
        console.log(`✅ Loaded ${areas.length} areas.`);
    } catch (error) {
        console.error("❌ Failed to fetch Area Master.");
        process.exit(1);
    }

    const rawPath = path.join(PATHS.RAW_DATA, '002_doutor.json');
    let rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));

    // --- ここで件数を制限 ---
    if (LIMIT && rawData.length > LIMIT) {
        console.log(`⚠️ Limiting process to the first ${LIMIT} items (Total: ${rawData.length})`);
        rawData = rawData.slice(0, LIMIT);
    }
    
    // SQL生成実行
    let totalSql = "-- ALETHEIA Doutor Seed (Area-ID Pre-Mapped with Geocoding)\n\n";
    totalSql += await convertToSql(rawData, areas, env.YAHOO_MAPS_CLIENT_ID);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, 'doutor.sql');
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQL Seed generated at: ${outputPath}`);
    await mf.dispose();
}

main().catch(console.error);