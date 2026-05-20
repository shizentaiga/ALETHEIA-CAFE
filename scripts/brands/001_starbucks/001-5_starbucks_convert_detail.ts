// Usage: npx tsx scripts/brands/001_starbucks/001-5_starbucks_convert_detail.ts

import fs from 'fs';
import path from 'path';

const PATH_CONFIG = {
    INPUT_FILE: 'scripts/data/raw/001-2_starbucks_detail.json', // 生のJSON
    INPUT_SQL: 'src/db/seed/brands/001-4_starbucks.sql',        // area_idの抽出元
    OUTPUT_SQL: 'src/db/seed/brands/001-5_starbucks.sql'
};

// 1. 生のスクレイピングデータの型定義
interface RawStoreDetail {
    store_id: string;
    detail_url: string;
    raw_input_fields: {
        name: string;
        address_5: string;
        location: string; // "lat,lng" の文字列
        public_wireless_service_flg?: string;
        business_day_mon_thu?: string;
        business_day_fri?: string;
        // 曜日別の営業時間
        mon_open?: string; mon_close?: string;
        tue_open?: string; tue_close?: string;
        wed_open?: string; wed_close?: string;
        thu_open?: string; thu_close?: string;
        fri_open?: string; fri_close?: string;
        sat_open?: string; sat_close?: string;
        sun_open?: string; sun_close?: string;
        hol_open?: string; hol_close?: string;
    };
    fetched_at: string;
}

interface ScheduleSlot {
    start: string;
    end: string;
}

interface BaseSchedule {
    days: string[];
    slots: ScheduleSlot[];
}

function cleanDisplayAddress(str: string) {
    if (!str) return '';
    return str.normalize('NFKC')
              .replace(/[‐－]/g, '-')    // 住所の番地で使われる全角ハイフン・マイナスだけを半角に（「ー」は除外）
              .replace(/\t/g, ' ')      // タブを半角スペースに
              .replace(/\r?\n/g, ' ')   // 改行を半角スペースに
              .trim();                  // 先頭と末尾の空白を削除
}

/**
 * 生の曜日データから、同一の営業時間ごとに集約された iCalendar 形式の JSON 文字列を生成する
 */
function buildScheduleJson(fields: RawStoreDetail['raw_input_fields']): string {
    const dayMapping: Record<string, { open?: string; close?: string }> = {
        'MO': { open: fields.mon_open, close: fields.mon_close },
        'TU': { open: fields.tue_open, close: fields.tue_close },
        'WE': { open: fields.wed_open, close: fields.wed_close },
        'TH': { open: fields.thu_open, close: fields.thu_close },
        'FR': { open: fields.fri_open, close: fields.fri_close },
        'SA': { open: fields.sat_open, close: fields.sat_close },
        'SU': { open: fields.sun_open, close: fields.sun_close }
    };

    const timeMap = new Map<string, string[]>();

    for (const [dayCode, range] of Object.entries(dayMapping)) {
        if (range.open && range.close && range.open !== '00:00' && range.close !== '00:00') {
            const timeKey = `${range.open}|${range.close}`;
            if (timeMap.has(timeKey)) {
                timeMap.get(timeKey)!.push(dayCode);
            } else {
                timeMap.set(timeKey, [dayCode]);
            }
        }
    }

    const base: BaseSchedule[] = [];
    timeMap.forEach((days, timeKey) => {
        const [start, end] = timeKey.split('|');
        base.push({
            days: days,
            slots: [{ start, end }]
        });
    });

    return JSON.stringify({
        base: base,
        exclude_holidays: false // スタバの基本営業スケジュールは祝日も考慮された時間が入るためfalse
    });
}

/**
 * 生データから必要な属性のみに厳選した attributes_json を生成する
 */
function buildAttributesJson(fields: RawStoreDetail['raw_input_fields']): string {
    const cleaned: Record<string, any> = {
        category: 'cat_cafe',
        // ext_source: 'starbucks_official'
    };

    // Wi-Fiフラグのハンドリング
    if (fields.public_wireless_service_flg === '1') {
        cleaned.wifi = true;
    }

    // フロント表示用の代表営業時間文字列をセット
    const mainHours = fields.business_day_mon_thu || fields.business_day_fri || '営業時間確認';
    cleaned.business_hours = mainHours;

    return JSON.stringify(cleaned);
}

function main() {
    console.log('🚀 Starting SQL conversion from raw JSON and merging area_id...');

    const jsonPath = path.resolve(PATH_CONFIG.INPUT_FILE);
    const inputSqlPath = path.resolve(PATH_CONFIG.INPUT_SQL);
    const outputSqlPath = path.resolve(PATH_CONFIG.OUTPUT_SQL);

    if (!fs.existsSync(jsonPath)) {
        console.error(`[Error] Input JSON file not found: ${jsonPath}`);
        process.exit(1);
    }
    if (!fs.existsSync(inputSqlPath)) {
        console.error(`[Error] Input SQL file not found: ${inputSqlPath}`);
        process.exit(1);
    }

    const rawStores: RawStoreDetail[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const inputSqlContent = fs.readFileSync(inputSqlPath, 'utf-8');

    // 2. 既存SQLから service_id -> area_id のマッピングを作成
    const areaIdMap = new Map<string, string>();
    // VALUES ('service_id', ..., 'area_id' の位置を捕捉する正規表現
    const insertRegex = /VALUES\s*\(\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*'[^']*'\s*,\s*'[^']+'\s*,\s*'([^']+)'/g;
    
    let match;
    while ((match = insertRegex.exec(inputSqlContent)) !== null) {
        const serviceId = match[1];
        const areaId = match[2];
        areaIdMap.set(serviceId, areaId);
    }

    console.log(`📌 Extracted ${areaIdMap.size} area_id mappings from source SQL.`);

    // 3. 新しいSQL文の生成
    const outputLines: string[] = [];

    for (const store of rawStores) {
        const fields = store.raw_input_fields;
        if (!fields) continue;

        // 識別子の生成
        const serviceId = `STB_${store.store_id}`;
        const brandId = 'brand_starbucks';
        const planId = 'free';

        // マップから既存の area_id を引き当てる
        const areaId = areaIdMap.get(serviceId) || 'NULL';
        const areaIdStr = areaId !== 'NULL' ? `'${areaId}'` : 'NULL';

        // 基本情報のマッピング（cleanDisplayAddress関数を適用）
        const title = `スターバックス コーヒー ${fields.name}`;
        const address = cleanDisplayAddress(fields.address_5);
        const websiteUrl = store.detail_url;

        // 座標パース ("43.0630144394,141.351145716" -> lat, lng)
        let lat = 0;
        let lng = 0;
        if (fields.location) {
            const [latStr, lngStr] = fields.location.split(',');
            lat = parseFloat(latStr) || 0;
            lng = parseFloat(lngStr) || 0;
        }

        // 動的JSONの構築
        const scheduleJson = buildScheduleJson(fields);
        const attributesJson = buildAttributesJson(fields);

        // SQLエスケープ処理
        const escapedTitle = title.replace(/'/g, "''");
        const escapedAddress = address.replace(/'/g, "''");
        const escapedWebsiteUrl = websiteUrl.replace(/'/g, "''");
        const escapedAttributes = attributesJson.replace(/'/g, "''");
        const escapedSchedule = scheduleJson.replace(/'/g, "''");

        // スキーマ順: service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, website_url, attributes_json, schedule_json
        const sqlLine = `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, website_url, attributes_json, schedule_json) VALUES ('${serviceId}', '${brandId}', NULL, '${planId}', ${areaIdStr}, '${escapedTitle}', '${escapedAddress}', ${lat}, ${lng}, '${escapedWebsiteUrl}', '${escapedAttributes}', '${escapedSchedule}');`;
        
        outputLines.push(sqlLine);
    }

    // 4. ファイル書き出し
    const outputDir = path.dirname(outputSqlPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputSqlPath, outputLines.join('\n') + '\n', 'utf-8');
    console.log(`🎉 Successfully generated destination SQL code: ${outputSqlPath}`);
    console.log(`総出力行数: ${outputLines.length} 件`);
}

main();