/**
 * Doutor Data Converter (SQL Generator with D1 Area Lookup)
 * 
 * Usage: npx tsx scripts/002_doutor_convert.ts
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
 * 住所のクリーニング（最小限）
 */
function cleanDisplayAddress(str: string) {
    if (!str) return '';
    // タブ、全角スペースを半角に変換し、改行を除去
    return str.replace(/\t/g, ' ').replace(/　/g, ' ').replace(/\r?\n/g, ' ').trim();
}

function convertToSql(items: any[], areas: AreaMaster[]) {
    return items.map((item, index) => {
        const lines = item.rawLines || [];
        const rawName = lines[0] || 'ドトールコーヒーショップ';
        const rawAddr = lines[1] || '';
        const phone = lines[2] || '';
        
        // 保存用の整形住所
        const displayAddress = cleanDisplayAddress(rawAddr);
        // 突合用の正規化住所
        const comparisonAddress = normalizeAddress(rawAddr);

        // --- 全文スキャンによるArea判定 ---
        const matchedArea = areas.find(area => comparisonAddress.includes(area.normalizedName));
        const areaId = matchedArea ? `'${matchedArea.area_id}'` : 'NULL';

        // 営業時間のパース（配列の3番目以降を結合）
        const businessHours = lines.slice(3).map((l: string) => cleanDisplayAddress(l)).join(' / ');

        // ID生成（電話番号があれば使用、なければインデックス）
        const storeId = phone ? phone.replace(/-/g, '') : `IDX${index.toString().padStart(5, '0')}`;
        const serviceId = `DTR_${storeId}`;

        const attributes = {
            category: "cat_cafe",
            wifi: true, // ドトールは基本提供前提（必要に応じて調整）
            phone: phone,
            ext_source: "doutor_official",
            ext_place_id: `DTR_OFFICIAL_${storeId}`,
            business_hours: businessHours || null
        };

        const escapedTitle = rawName.replace(/'/g, "''");
        const escapedAddr = displayAddress.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        // pref, city は NULL。area_id で管理。
        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, pref, city, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.DOUTOR}', '${CONFIG.OWNER_ID}', 'free', ${areaId}, '${escapedTitle}', '${escapedAddr}', NULL, NULL, NULL, NULL, '${jsonString}');`;
    }).join('\n');
}

async function main() {
    console.log("🛠 Starting Doutor Conversion with D1 Area Lookup...");

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
        })).sort((a, b) => b.name.length - a.name.length); // 長い名前（詳細な市町村）から順にマッチング
        
        console.log(`✅ Loaded ${areas.length} areas.`);
    } catch (error) {
        console.error("❌ Failed to fetch Area Master.");
        process.exit(1);
    }

    const rawPath = path.join(PATHS.RAW_DATA, '002_doutor.json');
    if (!fs.existsSync(rawPath)) {
        console.error("❌ Raw data not found.");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    
    let totalSql = "-- ALETHEIA Doutor Seed (Area-ID Pre-Mapped)\n\n";
    totalSql += convertToSql(rawData, areas);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, 'doutor.sql');
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQL Seed generated at: ${outputPath}`);
    await mf.dispose();
}

main().catch(console.error);