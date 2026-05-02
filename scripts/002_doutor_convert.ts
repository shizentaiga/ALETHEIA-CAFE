/**
 * Doutor Data Converter (SQL Generator)
 * 
 * Usage: npx tsx scripts/002_doutor_convert.ts
 */

import fs from 'fs';
import path from 'path';
import { normalize } from '@geolonia/normalize-japanese-addresses';
import { PATHS, CONFIG, ensureDirectory } from './utils.js';

// --- CONFIGURATION ---
const MAX_PROCESS_COUNT = 1500; // 安全のための実行制限（本番は1300に変更）
const SLEEP_MS = 200;        // ジオコーディング時の待機時間（負荷対策）
// ---------------------

/**
 * キャッシュ用マップ
 * Key: 市区町村までの住所文字列 (例: "北海道伊達市")
 * Value: { pref: "北海道", city: "伊達市" }
 */
const cityCache: Map<string, { pref: string; city: string }> = new Map();

function cleanString(str: string) {
    if (!str) return '';
    return str.replace(/\t/g, ' ').replace(/　/g, ' ').replace(/\r?\n/g, ' ').trim();
}

/**
 * 擬似ジオコーディング関数（テスト用）
 * 実際にはここで外部API（Google Maps等）を叩く想定
 */
async function getLatLng(address: string): Promise<{ lat: number | string; lng: number | string }> {
    // 今回はテストのため、ランダムな座標を返すか、本番実装時はここにAPIコールを記述
    // 負荷が強すぎる場合は NULL を返すように切り替え可能
    return { lat: 'NULL', lng: 'NULL' }; 
}

async function convertToSql(items: any[]) {
    const results: string[] = [];
    // MAX_PROCESS_COUNT で制限
    const targetItems = items.slice(0, MAX_PROCESS_COUNT);

    for (let i = 0; i < targetItems.length; i++) {
        const item = targetItems[i];
        const lines = item.rawLines;
        const rawName = lines[0] || 'Doutor Coffee Shop';
        const rawAddress = cleanString(lines[1] || '');
        const phone = lines[2] || '';
        const businessHours = lines.slice(3).map((l: string) => cleanString(l)).join(' / ');

        const storeId = phone ? phone.replace(/-/g, '') : `IDX${i.toString().padStart(5, '0')}`;
        const serviceId = `DTR_${storeId}`;

        // --- 都道府県・市区町村の分離ロジック ---
        let pref = '';
        let city = '';
        
        // 住所の冒頭から「市・区・町・村」あたりまでをキーにしてキャッシュ確認
        // 簡易的に「最初の7文字」程度をキーにするか、正規化後の結果を保存
        const possibleCityKey = rawAddress.substring(0, 8); 

        if (cityCache.has(possibleCityKey)) {
            const cached = cityCache.get(possibleCityKey)!;
            pref = cached.pref;
            city = cached.city;
        } else {
            // キャッシュにない場合のみ normalize を実行
            const normalized = await normalize(rawAddress);
            pref = normalized.pref ?? '';
            city = normalized.city ?? '';
            cityCache.set(possibleCityKey, { pref, city });
            console.log(`[Cache Miss] Normalized: ${pref}${city}`);
        }

        // 緯度経度の取得 (テスト)
        const coords = await getLatLng(rawAddress);
        if (coords.lat !== 'NULL') await new Promise(resolve => setTimeout(resolve, SLEEP_MS));

        const attributes = {
            category: "cat_cafe",
            wifi: true,
            phone: phone,
            ext_source: "doutor_official",
            ext_place_id: `DTR_OFFICIAL_${storeId}`,
            business_hours: businessHours
        };

        const escapedTitle = cleanString(rawName).replace(/'/g, "''");
        const escapedAddr = rawAddress.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        results.push(`INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, title, address, pref, city, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.DOUTOR}', '${CONFIG.OWNER_ID}', 'free', '${escapedTitle}', '${escapedAddr}', '${pref}', '${city}', ${coords.lat}, ${coords.lng}, '${jsonString}');`);
        
        if ((i + 1) % 5 === 0) console.log(`⏳ Processed ${i + 1} / ${targetItems.length}...`);
    }
    return results.join('\n');
}

async function main() {
    console.log(`🛠 Converting Doutor Data (Limit: ${MAX_PROCESS_COUNT})...`);
    const rawPath = path.join(PATHS.RAW_DATA, '002_doutor.json');
    
    if (!fs.existsSync(rawPath)) {
        console.error("❌ Raw data not found.");
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    let totalSql = "-- ALETHEIA Doutor Nationwide Generated Seeds\n\n";
    
    totalSql += await convertToSql(rawData);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, 'doutor.sql');
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQL Seed generated at: ${outputPath}`);
    console.log(`📊 Cache size (Cities): ${cityCache.size}`);
}

main();