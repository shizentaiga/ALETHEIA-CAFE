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
 * - Full-width spaces to half-width
 * - Tabs to spaces (Handling the warning you noticed)
 * - Trim whitespace
 */
function cleanString(str: string) {
    if (!str) return '';
    return str
        .replace(/\t/g, ' ')  // 紛らわしい文字（タブ）を半角スペースに置換
        .replace(/　/g, ' ') // 全角スペースを半角に
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
        const rawName = lines[0] || 'ドトールコーヒーショップ';
        const rawAddress = lines[1] || '';
        const phone = lines[2] || '';
        
        // 4番目以降の要素（営業時間）を結合して一つの文字列にする
        const businessHours = lines.slice(3).map((l: string) => cleanString(l)).join(' / ');

        // 固有IDの生成（電話番号があれば活用、なければインデックス）
        // ドトールの公式IDが不明なため、住所と電話番号から生成
        const storeId = phone ? phone.replace(/-/g, '') : `IDX${index.toString().padStart(5, '0')}`;
        const serviceId = `DTR_${storeId}`;
        
        const cleanAddress = cleanString(rawAddress);
        
        // 属性オブジェクトの構築
        const attributes = {
            category: "cat_cafe",
            wifi: true, // ドトールは基本導入されているが、不明なため一旦true（適宜調整）
            phone: phone,
            ext_source: "doutor_official",
            ext_place_id: `DTR_OFFICIAL_${storeId}`,
            business_hours: businessHours
        };

        // SQLセーフティ: シングルクォートのエスケープ
        const escapedTitle = cleanString(rawName).replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        // 緯度経度はスクレイピングデータに含まれないため、初期値はNULL
        // 後ほど別工程でジオコーディングすることを想定
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