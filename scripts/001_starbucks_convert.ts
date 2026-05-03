/**
 * Starbucks Data Converter (SQL Generator with D1 Area Lookup)
 * 
 * Usage: npx tsx scripts/001_starbucks_convert.ts
 */

import fs from 'fs';
import path from 'path';
import { Miniflare } from "miniflare";
import { PATHS, CONFIG, ensureDirectory } from './utils.js';
import { normalizeAddress } from '../src/lib/searchUtils.js';

/**
 * DBから取得したエリアマスターの型
 */
interface AreaMaster {
    area_id: string;
    name: string;
    normalizedName: string;
}

/**
 * Maps raw API fields to the database schema.
 */
function convertToSql(hits: any[], areas: AreaMaster[]) {
    return hits.map(hit => {
        const f = hit.fields;
        const storeId = f.store_id;
        const serviceId = `STB_${storeId}`;
        
        // 住所の正規化
        const cleanAddress = normalizeAddress(f.address_5 || '');
        
        // --- 全文スキャンによるArea判定 ---
        // エリア名が長い順にソート済みなので、最長一致で判定される
        const matchedArea = areas.find(area => cleanAddress.includes(area.normalizedName));
        const areaId = matchedArea ? `'${matchedArea.area_id}'` : 'NULL';
        
        // 座標
        const [lat, lng] = f.location ? f.location.split(',') : ['NULL', 'NULL'];
        
        // 属性オブジェクト
        const attributes = {
            category: "cat_cafe",
            wifi: f.public_wireless_service_flg === "1",
            ext_source: "starbucks_official",
            ext_place_id: `STB_OFFICIAL_${storeId}`,
            business_hours: f.business_day_mon_thu || null 
        };

        const escapedTitle = `スターバックス コーヒー ${f.name}`.replace(/'/g, "''");
        const escapedAddress = cleanAddress.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        // pref, city は NULL (固定) で出力
        // area_id カラムを追加
        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, pref, city, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.STARBUCKS}', '${CONFIG.OWNER_ID}', 'free', ${areaId}, '${escapedTitle}', '${escapedAddress}', NULL, NULL, ${lat}, ${lng}, '${jsonString}');`;
    }).join('\n');
}

async function main() {
    console.log("🛠 Starting Starbucks Conversion with D1 Area Lookup...");

    // 1. MiniflareでD1にアクセス
    const mf = new Miniflare({
        d1Databases: { ALETHEIA_CAFE_DB: "70ed05d4-20d7-484d-bdc1-3a5e9ea63086" },
        modules: true,
        script: `export default { fetch: () => new Response("ok") }`,
        d1Persist: ".wrangler/state/v3/d1", 
    });

    let areas: AreaMaster[] = [];
    try {
        const db = await mf.getD1Database("ALETHEIA_CAFE_DB");
        console.log("⏳ Fetching area master from D1...");
        const res = await db.prepare("SELECT area_id, name FROM areas WHERE area_level = 3").all();
        
        areas = (res.results || []).map((a: any) => ({
            area_id: a.area_id,
            name: a.name,
            normalizedName: normalizeAddress(a.name)
        })).sort((a, b) => b.name.length - a.name.length); // 長い名前を優先して誤判定を防止
        
        console.log(`✅ Loaded ${areas.length} areas.`);
    } catch (error) {
        console.error("❌ Failed to access D1. Check if Miniflare can find your state directory.");
        process.exit(1);
    }

    // 2. 原資JSONの読み込み
    const rawPath = path.join(PATHS.RAW_DATA, '001_starbucks.json');
    if (!fs.existsSync(rawPath)) {
        console.error("❌ Raw data not found at:", rawPath);
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));

    // 3. SQL生成
    let totalSql = "-- ALETHEIA Starbucks Seed (Area-ID Pre-Mapped)\n";
    totalSql += "-- Note: pref/city columns are intentionally set to NULL.\n\n";
    totalSql += convertToSql(rawData, areas);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, 'starbucks.sql');
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQL Seed generated at: ${outputPath}`);
    console.log(`📊 Total Records: ${rawData.length}`);

    await mf.dispose();
}

main().catch(console.error);