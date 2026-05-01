//  npx tsx scripts/001_starbucks_convert.ts

import fs from 'fs';
import path from 'path';
import { PATHS, CONFIG, ensureDirectory } from './utils';

function normalizeAddress(addr: string) {
    if (!addr) return '';
    return addr.replace(/　/g, ' ').trim();
}

function convertToSql(hits: any[]) {
    return hits.map(hit => {
        const f = hit.fields;
        const storeId = f.store_id;
        const serviceId = `STB_${storeId}`;
        const cleanAddress = normalizeAddress(f.address_5);
        const [lat, lng] = f.location ? f.location.split(',') : ['NULL', 'NULL'];
        
        const attributes = {
            category: "cat_cafe",
            wifi: f.public_wireless_service_flg === "1",
            ext_source: "starbucks_official",
            ext_place_id: `STB_OFFICIAL_${storeId}`,
            business_hours: f.business_hours_text ? f.business_hours_text.replace(/\r?\n/g, ' ') : null
        };

        const escapedTitle = `スターバックス コーヒー ${f.name}`.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, title, address, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.DB_ID}', '${CONFIG.OWNER_ID}', 'free', '${escapedTitle}', '${cleanAddress}', ${lat}, ${lng}, '${jsonString}');`;
    }).join('\n');
}

function main() {
    console.log("🛠 Converting Starbucks Raw Data to SQL...");
    const rawPath = path.join(PATHS.RAW_DATA, '001_starbucks.json');
    
    if (!fs.existsSync(rawPath)) {
        console.error("❌ Raw data not found. Please run fetch script first.");
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