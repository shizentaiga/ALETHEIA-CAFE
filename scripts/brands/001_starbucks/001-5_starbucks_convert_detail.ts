// Usage: npx tsx scripts/brands/001_starbucks/001-5_starbucks_convert_detail.ts

import fs from 'fs';
import path from 'path';

const PATH_CONFIG = {
    INPUT_FILE: 'scripts/data/raw/001-2_starbucks_detail.json', // 整形済みJSON（area_idは無視）
    INPUT_SQL: 'src/db/seed/brands/001-4_starbucks.sql',        // area_idの抽出元
    OUTPUT_SQL: 'src/db/seed/brands/001-5_starbucks.sql'
};

interface JsonStore {
    service_id: string;
    brand_id: string;
    owner_id: string | null;
    plan_id: string;
    area_id: string | null;
    title: string;
    address: string;
    lat: number;
    lng: number;
    website_url: string;
    schedule_json: string;
    attributes_json: string;
}

interface ScheduleSlot {
    start: string;
    end: string;
}

interface BaseSchedule {
    days: string[];
    slots: ScheduleSlot[];
}

/**
 * 曜日ごとに独立しているスケジュールを、同じ営業時間ごとに集約する
 */
function optimizeScheduleJson(originalScheduleJsonString: string): string {
    try {
        const parsed = JSON.parse(originalScheduleJsonString);
        if (!parsed.base || !Array.isArray(parsed.base)) {
            return originalScheduleJsonString;
        }

        // 営業時間の組み合わせ（例: "07:00|22:00") をキーにして曜日を集約するマップ
        const timeMap = new Map<string, { days: string[]; slots: ScheduleSlot[] }>();

        for (const item of parsed.base) {
            const day = item.days[0]; // 元データは1要素ずつ ["MO"] の想定
            const slot = item.slots?.[0];
            
            if (!day || !slot) continue;

            // 集約用のユニークキーを作成
            const timeKey = `${slot.start}|${slot.end}`;

            if (timeMap.has(timeKey)) {
                timeMap.get(timeKey)!.days.push(day);
            } else {
                timeMap.set(timeKey, {
                    days: [day],
                    slots: [{ start: slot.start, end: slot.end }]
                });
            }
        }

        // マップから新しい base 配列を再構築
        const optimizedBase: BaseSchedule[] = Array.from(timeMap.values());

        return JSON.stringify({
            base: optimizedBase,
            exclude_holidays: parsed.exclude_holidays ?? true
        });

    } catch (e) {
        console.warn('  [Warning] スケジュールの集約処理に失敗しました。元のデータを返します。');
        return originalScheduleJsonString;
    }
}

/**
 * attributes_json からスタバに無関係な項目、未確定な項目を完全に排除する
 */
function cleanAttributesJson(originalAttributesJsonString: string): string {
    try {
        const parsed = JSON.parse(originalAttributesJsonString);
        
        // 確実にスターバックスで確定・判明している情報のみに厳選
        const cleaned: Record<string, any> = {};

        if (parsed.category) cleaned.category = parsed.category;
        if (parsed.wifi === true) cleaned.wifi = true;
        if (parsed.takeout === true) cleaned.takeout = true;
        if (parsed.smoking === false || parsed.smoking === true) cleaned.smoking = parsed.smoking;
        if (parsed.business_hours) cleaned.business_hours = parsed.business_hours;

        return JSON.stringify(cleaned);
    } catch (e) {
        console.warn('  [Warning] 属性JSONのクレンジングに失敗しました。元のデータを返します。');
        return originalAttributesJsonString;
    }
}

function main() {
    console.log('🚀 Starting SQL conversion and merging process (with JSON cleaning)...');

    const jsonPath = path.resolve(PATH_CONFIG.INPUT_FILE);
    const inputSqlPath = path.resolve(PATH_CONFIG.INPUT_SQL);
    const outputSqlPath = path.resolve(PATH_CONFIG.OUTPUT_SQL);

    // 1. ファイルの存在チェックと読み込み
    if (!fs.existsSync(jsonPath)) {
        console.error(`[Error] Input JSON file not found: ${jsonPath}`);
        process.exit(1);
    }
    if (!fs.existsSync(inputSqlPath)) {
        console.error(`[Error] Input SQL file not found: ${inputSqlPath}`);
        process.exit(1);
    }

    const jsonStores: JsonStore[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const inputSqlContent = fs.readFileSync(inputSqlPath, 'utf-8');

    // 2. 既存SQLから service_id -> area_id のマッピングを作成
    const areaIdMap = new Map<string, string>();
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

    for (const store of jsonStores) {
        const serviceId = store.service_id;
        
        // 既存SQLから正しい area_id を取得
        const areaId = areaIdMap.get(serviceId) || 'NULL';
        const areaIdStr = areaId !== 'NULL' ? `'${areaId}'` : 'NULL';

        // JSONデータのクレンジングと最適化
        const optimizedSchedule = optimizeScheduleJson(store.schedule_json);
        const cleanedAttributes = cleanAttributesJson(store.attributes_json);

        // SQLエスケープ処理
        const escapedTitle = store.title.replace(/'/g, "''");
        const escapedAddress = store.address.replace(/'/g, "''");
        const escapedAttributes = cleanedAttributes.replace(/'/g, "''");
        const escapedSchedule = optimizedSchedule.replace(/'/g, "''");

        // SQL出力
        const sqlLine = `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json, schedule_json) VALUES ('${serviceId}', '${store.brand_id}', NULL, '${store.plan_id}', ${areaIdStr}, '${escapedTitle}', '${escapedAddress}', ${store.lat}, ${store.lng}, '${escapedAttributes}', '${escapedSchedule}');`;
        
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