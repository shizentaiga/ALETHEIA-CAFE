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
 * Replaces full-width spaces with half-width and trims whitespace.
 */
function normalizeAddress(addr: string) {
    if (!addr) return '';
    return addr.replace(/　/g, ' ').trim();
}

/**
 * Maps raw API fields to the database schema.
 * Generates SQL statements with escaped characters to prevent syntax errors.
 */
function convertToSql(hits: any[]) {
    return hits.map(hit => {
        const f = hit.fields;
        const storeId = f.store_id;
        const serviceId = `STB_${storeId}`;
        const cleanAddress = normalizeAddress(f.address_5);
        
        // Handle coordinates; default to NULL if missing
        const [lat, lng] = f.location ? f.location.split(',') : ['NULL', 'NULL'];
        
        // Construct the attributes object for the JSONB/TEXT column
        const attributes = {
            category: "cat_cafe",
            wifi: f.public_wireless_service_flg === "1",
            ext_source: "starbucks_official",
            ext_place_id: `STB_OFFICIAL_${storeId}`,
            business_hours: f.business_hours_text ? f.business_hours_text.replace(/\r?\n/g, ' ') : null
        };

        // Escape single quotes for SQL safety
        const escapedTitle = `スターバックス コーヒー ${f.name}`.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        // Build the final SQL query
        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, title, address, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.STARBUCKS}', '${CONFIG.OWNER_ID}', 'free', '${escapedTitle}', '${cleanAddress}', ${lat}, ${lng}, '${jsonString}');`;
    }).join('\n');
}

/**
 * Main execution logic:
 * Reads raw JSON, converts it, and writes the resulting .sql file.
 */
function main() {
    console.log("🛠 Converting Starbucks Raw Data to SQL...");
    const rawPath = path.join(PATHS.RAW_DATA, '001_starbucks.json');
    
    // Safety check: Ensure raw data exists before processing
    if (!fs.existsSync(rawPath)) {
        console.error("❌ Raw data not found. Please run fetch script first.");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    let totalSql = "-- ALETHEIA Starbucks Nationwide Generated Seeds\n\n";
    totalSql += convertToSql(rawData);

    // Ensure output directory exists and save the file
    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, 'starbucks.sql');
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQL Seed generated at: ${outputPath}`);
    console.log(`📊 Total Records processed: ${rawData.length}`);
}

main();