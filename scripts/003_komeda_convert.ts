/**
 * Komeda Data Converter (SQL Generator with D1 Area Lookup)
 * 
 * Usage: npx tsx scripts/003_komeda_convert.ts
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
        // --- 修正箇所：ブランド名を店名の前に付与 ---
        const brandPrefix = 'コメダ珈琲店';
        const rawName = item.name ? `${brandPrefix} ${item.name}` : brandPrefix;
        
        const rawAddr = item.address || '';
        const komedaId = item.id;
        
        // 保存用の整形住所
        const displayAddress = cleanDisplayAddress(rawAddr);
        // 突合用の正規化住所
        const comparisonAddress = normalizeAddress(rawAddr);

        // --- 全文スキャンによるArea判定（市区町村との紐付け） ---
        const matchedArea = areas.find(area => comparisonAddress.includes(area.normalizedName));
        const areaId = matchedArea ? `'${matchedArea.area_id}'` : 'NULL';

        // サービスIDの生成（Komeda公式のIDを使用）
        const serviceId = `KMD_${komedaId}`;

        const attributes = {
            category: "cat_cafe",
            ext_source: "komeda_official",
            ext_place_id: `KMD_OFFICIAL_${komedaId}`,
            // JSONから取得できない情報は必要に応じてデフォルト値を設定
            brand_type: item.brand_type || 1
        };

        const escapedTitle = rawName.replace(/'/g, "''");
        const escapedAddr = displayAddress.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, pref, city, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.KOMEDA}', '${CONFIG.OWNER_ID}', 'free', ${areaId}, '${escapedTitle}', '${escapedAddr}', NULL, NULL, NULL, NULL, '${jsonString}');`;
    }).join('\n');
}

async function main() {
    console.log("🛠 Starting Komeda Conversion with D1 Area Lookup...");

    const mf = new Miniflare({
        d1Databases: { ALETHEIA_CAFE_DB: "70ed05d4-20d7-484d-bdc1-3a5e9ea63086" },
        modules: true,
        script: `export default { fetch: () => new Response("ok") }`,
        d1Persist: ".wrangler/state/v3/d1",
    });

    let areas: AreaMaster[] = [];
    try {
        const db = await mf.getD1Database("ALETHEIA_CAFE_DB");
        // 市区町村レベル（area_level = 3）のマスターを取得
        const res = await db.prepare("SELECT area_id, name FROM areas WHERE area_level = 3").all();
        
        areas = (res.results || []).map((a: any) => ({
            area_id: a.area_id,
            name: a.name,
            normalizedName: normalizeAddress(a.name)
        })).sort((a, b) => b.name.length - a.name.length); // 名前の長い順（詳細な地名）にソートして誤判定を防ぐ
        
        console.log(`✅ Loaded ${areas.length} areas.`);
    } catch (error) {
        console.error("❌ Failed to fetch Area Master.");
        process.exit(1);
    }

    const rawPath = path.join(PATHS.RAW_DATA, '003_komeda.json');
    if (!fs.existsSync(rawPath)) {
        console.error("❌ Raw data not found at " + rawPath);
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    
    let totalSql = "-- ALETHEIA Komeda Seed (Area-ID Pre-Mapped)\n\n";
    totalSql += convertToSql(rawData, areas);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, 'komeda.sql');
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQL Seed generated at: ${outputPath}`);
    await mf.dispose();
}

main().catch(console.error);