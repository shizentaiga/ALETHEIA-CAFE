/**
 * Mister Donuts Data Converter (SQL Generator with D1 Area Lookup)
 * 
 * Usage: npx tsx scripts/004-2_misterdonuts_convert.ts
 */

import fs from 'fs';
import path from 'path';
import { Miniflare } from "miniflare";
import { PATHS, CONFIG, ensureDirectory } from './utils.js';
import { normalizeAddress } from '../src/lib/searchUtils.js';

interface AreaMaster {
    area_id: string;
    name: string;
    normalizedName: string;
}

/**
 * 住所のクリーニング
 */
function cleanDisplayAddress(str: string) {
    if (!str) return '';
    return str.replace(/\t/g, ' ').replace(/　/g, ' ').replace(/\r?\n/g, ' ').trim();
}

function convertToSql(items: any[], areas: AreaMaster[]) {
    return items.map((item) => {
        // ブランド名を冠した店名（例: ミスタードーナツ けやきウォーク前橋 ショップ）
        const brandPrefix = 'ミスタードーナツ';
        const rawName = item.name ? `${brandPrefix} ${item.name}` : brandPrefix;
        
        const rawAddr = item.address || '';
        const mdId = item.id;
        
        const displayAddress = cleanDisplayAddress(rawAddr);
        const comparisonAddress = normalizeAddress(rawAddr);

        // Area判定（市区町村との紐付け）
        const matchedArea = areas.find(area => comparisonAddress.includes(area.normalizedName));
        const areaId = matchedArea ? `'${matchedArea.area_id}'` : 'NULL';

        // サービスIDの生成
        const serviceId = `MSD_${mdId}`;

        // schema.sqlの厳選されたキーに基づき attributes_json を構成
        const attributes = {
            category: "cat_cafe",
            wifi: item.raw_icons?.some((s: string) => s.includes('Wi-Fi')) || false,
            outlets: false, // スクレイピング項目にないためデフォルトfalse
            business_hours: "", // Rawデータに含まれないため空文字（必要に応じ詳細パース）
            payment: [], // 後の拡張用
            buffet: item.services?.has_buffet || false, // ドーナツビュッフェ
            baby: false, // 後の拡張用
            // おまけの拡張項目
            pop_buffet: item.services?.has_pop_buffet || false 
        };

        const escapedTitle = rawName.replace(/'/g, "''");
        const escapedAddr = displayAddress.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");
        
        const lat = item.location?.lat ?? 'NULL';
        const lng = item.location?.lng ?? 'NULL';

        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.MISTERDONUTS}', '${CONFIG.OWNER_ID}', 'free', ${areaId}, '${escapedTitle}', '${escapedAddr}', ${lat}, ${lng}, '${jsonString}');`;
    }).join('\n');
}

async function main() {
    console.log("🛠 Starting Mister Donuts Conversion with D1 Area Lookup...");

    const mf = new Miniflare({
        d1Databases: { ALETHEIA_CAFE_DB: "70ed05d4-20d7-484d-bdc1-3a5e9ea63086" },
        modules: true,
        script: `export default { fetch: () => new Response("ok") }`,
        d1Persist: ".wrangler/state/v3/d1",
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

    const rawPath = path.join(PATHS.RAW_DATA, '004_misterdonuts.json');
    if (!fs.existsSync(rawPath)) {
        console.error("❌ Raw data not found at " + rawPath);
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    
    let totalSql = "-- ALETHEIA Mister Donuts Seed (Area-ID Pre-Mapped)\n\n";
    totalSql += convertToSql(rawData, areas);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, 'misterdonuts.sql');
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQL Seed generated at: ${outputPath}`);
    await mf.dispose();
}

main().catch(console.error);