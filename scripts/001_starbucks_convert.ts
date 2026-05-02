/**
 * Starbucks Data Converter (SQL Generator)
 * 
 * Usage: npx tsx scripts/001_starbucks_convert.ts
 * 
 * This script transforms raw JSON data into SQLite-compatible 
 * INSERT OR REPLACE statements for the ALETHEIA database.
 */

import fs from 'fs';
import path from 'path';
import { PATHS, CONFIG, ensureDirectory } from './utils.js';

/**
 * Normalizes address strings for consistent database storage.
 */
function normalizeAddress(addr: string) {
    if (!addr) return '';
    return addr.replace(/　/g, ' ').trim();
}

/**
 * Maps raw API fields to the database schema.
 * Updated to include 'pref' and 'city' from raw address_1 and address_2.
 */
function convertToSql(hits: any[]) {
    return hits.map(hit => {
        const f = hit.fields;
        const storeId = f.store_id;
        const serviceId = `STB_${storeId}`;
        
        // Raw address mapping
        const pref = f.address_1 || ''; // e.g., '北海道'
        const city = f.address_2 || ''; // e.g., '札幌市中央区'
        const cleanAddress = normalizeAddress(f.address_5);
        
        // Handle coordinates
        const [lat, lng] = f.location ? f.location.split(',') : ['NULL', 'NULL'];
        
        // Attributes object
        const attributes = {
            category: "cat_cafe",
            wifi: f.public_wireless_service_flg === "1",
            ext_source: "starbucks_official",
            ext_place_id: `STB_OFFICIAL_${storeId}`,
            // business_hours_text が無い場合は business_day_mon_thu 等から合成も可能ですが、
            // 現状はシンプルに属性として保持
            business_hours: f.business_day_mon_thu || null 
        };

        // SQL Escaping
        const escapedTitle = `スターバックス コーヒー ${f.name}`.replace(/'/g, "''");
        const escapedAddress = cleanAddress.replace(/'/g, "''");
        const escapedPref = pref.replace(/'/g, "''");
        const escapedCity = city.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        // INSERT statement with pref and city columns
        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, title, address, pref, city, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.STARBUCKS}', '${CONFIG.OWNER_ID}', 'free', '${escapedTitle}', '${escapedAddress}', '${escapedPref}', '${escapedCity}', ${lat}, ${lng}, '${jsonString}');`;
    }).join('\n');
}

function main() {
    console.log("🛠 Converting Starbucks Raw Data to SQL with Pref/City...");
    const rawPath = path.join(PATHS.RAW_DATA, '001_starbucks.json');
    
    if (!fs.existsSync(rawPath)) {
        console.error("❌ Raw data not found.");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    let totalSql = "-- ALETHEIA Starbucks Nationwide Generated Seeds\n\n";
    totalSql += convertToSql(rawData);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, 'starbucks.sql');
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQL Seed generated at: ${outputPath}`);
    console.log(`📊 Total Records processed: ${rawData.length}`);
}

main();