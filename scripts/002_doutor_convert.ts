/**
 * Doutor Data Converter (SQL Generator)
 * 
 * Usage: npx tsx scripts/002_doutor_convert.ts
 */

import fs from 'fs';
import path from 'path';
import { PATHS, CONFIG, ensureDirectory } from './utils.js';

/**
 * Normalizes strings: 
 * - Tabs to spaces (Fixes "ambiguous characters" warning)
 * - Full-width spaces to half-width
 * - Remove newlines and trim whitespace
 */
function cleanString(str: string) {
    if (!str) return '';
    return str
        .replace(/\t/g, ' ')  // Replace tabs with spaces
        .replace(/　/g, ' ') // Replace ideographic spaces with half-width
        .replace(/\r?\n/g, ' ')
        .trim();
}

/**
 * Maps Doutor rawLines to the database schema.
 */
function convertToSql(items: any[]) {
    return items.map((item, index) => {
        const lines = item.rawLines;
        
        // Doutor's rawLines structure:
        // [0]: Name, [1]: Address, [2]: Phone, [3~]: Business Hours
        const rawName = lines[0] || 'Doutor Coffee Shop';
        const rawAddress = lines[1] || '';
        const phone = lines[2] || '';
        
        // Merge remaining elements (index 3+) into a single string for business hours
        const businessHours = lines.slice(3).map((l: string) => cleanString(l)).join(' / ');

        // Generate Unique ID (Use phone number if available, otherwise use index)
        const storeId = phone ? phone.replace(/-/g, '') : `IDX${index.toString().padStart(5, '0')}`;
        const serviceId = `DTR_${storeId}`;
        
        const cleanAddress = cleanString(rawAddress);
        
        // Construct attributes object
        const attributes = {
            category: "cat_cafe",
            wifi: true, // Assuming Wi-Fi is available (Adjust as needed)
            phone: phone,
            ext_source: "doutor_official",
            ext_place_id: `DTR_OFFICIAL_${storeId}`,
            business_hours: businessHours
        };

        // SQL Safety: Escape single quotes
        const escapedTitle = cleanString(rawName).replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        // Coordinates are set to NULL by default as they are not in the raw data.
        // Geocoding is required in a separate process for map integration.
        const lat = 'NULL';
        const lng = 'NULL';

        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, title, address, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.DOUTOR}', '${CONFIG.OWNER_ID}', 'free', '${escapedTitle}', '${cleanAddress}', ${lat}, ${lng}, '${jsonString}');`;
    }).join('\n');
}

function main() {
    console.log("🛠 Converting Doutor Raw Data to SQL...");
    const rawPath = path.join(PATHS.RAW_DATA, '002_doutor.json');
    
    if (!fs.existsSync(rawPath)) {
        console.error("❌ Raw data not found. Please run fetch script first.");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    
    let totalSql = "-- ALETHEIA Doutor Nationwide Generated Seeds\n";
    totalSql += `-- Generated at: ${new Date().toISOString()}\n\n`;
    totalSql += convertToSql(rawData);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, 'doutor.sql');
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQL Seed generated at: ${outputPath}`);
    console.log(`📊 Total Records processed: ${rawData.length}`);
    console.log(`💡 Note: Lat/Lng are set to NULL. Geographic coordinates needed for map display.`);
}

main();