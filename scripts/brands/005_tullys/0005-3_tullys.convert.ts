/**
 * タリーズ データコンバーター (D1エリア参照付きSQL生成)
 * * 使用方法: npx tsx scripts/brands/005_tullys/0005-3_tullys.convert.ts
 */

import fs from 'fs';
import path from 'path';
import { Miniflare } from "miniflare";
import { PATHS, CONFIG, ensureDirectory } from '../../utils.js';
import { normalizeAddress } from '../../../src/lib/searchUtils.js';

/**
 * プロバイダー固有の設定
 */
const CONVERTER_CONFIG = {
    BRAND_ID: 'TULLYS',
    INPUT_FILE: '005-2_tullys_detail.json',
    OUTPUT_FILE: '005-1_tullys.sql', // 最終出力用SQL
    D1_BINDING: 'ALETHEIA_CAFE_DB',
    D1_DATABASE_ID: '70ed05d4-20d7-484d-bdc1-3a5e9ea63086',
    D1_PERSIST_PATH: '.wrangler/state/v3/d1',
    AREA_LEVEL_TARGET: 3,
    BRAND_PREFIX: 'タリーズコーヒー'
};

/**
 * DBから取得したエリアマスターの型
 */
interface AreaMaster {
    area_id: string;
    name: string;
    normalizedName: string;
}

/**
 * 曜日マッピング (日本語名 -> iCalendar 2文字コード)
 */
const DAY_MAP: { [key: string]: string } = {
    '月曜日': 'MO',
    '火曜日': 'TU',
    '水曜日': 'WE',
    '木曜日': 'TH',
    '金曜日': 'FR',
    '土曜日': 'SA',
    '日曜日': 'SU'
};

/**
 * 住所のクリーニング
 */
function cleanDisplayAddress(str: string) {
    if (!str) return '';
    return str.replace(/\t/g, ' ').replace(/　/g, ' ').replace(/\r?\n/g, ' ').trim();
}

/**
 * 営業時間テキストから時間枠をパースする
 * 例: "月曜日　07:30～21:00" -> { start: "07:30", end: "21:00" }
 */
function parseTimeSlot(hourStr: string) {
    if (hourStr.includes('定休日') || hourStr.includes('休業')) {
        return null;
    }
    const match = hourStr.match(/(\d{2}:\d{2})[～-](\d{2}:\d{2})/);
    if (match) {
        return { start: match[1], end: match[2] };
    }
    return null;
}

/**
 * タリーズの配列形式の営業時間から schedule_json を構築・集約する
 */
function buildScheduleJson(businessHours: string[]) {
    if (!businessHours || businessHours.length === 0) {
        return JSON.stringify({});
    }

    const slotGroups: { [key: string]: string[] } = {};

    for (const hourStr of businessHours) {
        const dayKey = Object.keys(DAY_MAP).find(d => hourStr.includes(d));
        if (!dayKey) continue;

        const icallDay = DAY_MAP[dayKey];
        const slot = parseTimeSlot(hourStr);

        if (slot) {
            const key = `${slot.start}-${slot.end}`;
            if (!slotGroups[key]) {
                slotGroups[key] = [];
            }
            slotGroups[key].push(icallDay);
        }
    }

    const base = Object.entries(slotGroups).map(([timeKey, days]) => {
        const [start, end] = timeKey.split('-');
        return {
            days: days,
            slots: [{ start, end }]
        };
    });

    return JSON.stringify({
        base,
        exclude_holidays: false
    });
}

/**
 * 生のAPIデータをデータベーススキーマ用のSQLに変換します
 */
function convertToSql(items: any[], areas: AreaMaster[]) {
    return items.map((item) => {
        const rawName = item.name ? `${CONVERTER_CONFIG.BRAND_PREFIX} ${item.name}` : CONVERTER_CONFIG.BRAND_PREFIX;
        const rawAddr = item.address || '';
        const tullysId = item.id;
        
        const displayAddress = cleanDisplayAddress(rawAddr);
        const comparisonAddress = normalizeAddress(rawAddr);

        const matchedArea = areas.find(area => comparisonAddress.includes(area.normalizedName));
        let areaId: string;
        
        if (matchedArea) {
            areaId = `'${matchedArea.area_id}'`;
        } else {
            areaId = "'00'";
            console.warn(`⚠️ エリア不一致(全国フォールバック): [ID: ${tullysId}] ${rawName} -> 住所: ${displayAddress}`);
        }

        const serviceId = `TLY_${tullysId}`;

        let mondayHours = "";
        if (item.businessHours) {
            const mondayStr = item.businessHours.find((h: string) => h.includes("月曜日"));
            if (mondayStr) {
                const slot = parseTimeSlot(mondayStr);
                if (slot) {
                    mondayHours = `${slot.start}〜${slot.end}`;
                } else if (mondayStr.includes("定休日")) {
                    mondayHours = "定休日";
                }
            }
        }

        // D1リソース節約のため、全店共通項目(outlets, parking, takeout, cash_only)を削除
        const attributes = {
            category: "cat_cafe",
            wifi: item.services?.some((s: string) => s.includes('Wi-Fi')) || false,
            smoking: item.services?.some((s: string) => s.includes('たばこ') || s.includes('喫煙')) || false,
            business_hours: mondayHours
        };

        const scheduleJsonStr = buildScheduleJson(item.businessHours || []);

        const escapedTitle = rawName.replace(/'/g, "''");
        const escapedAddr = displayAddress.replace(/'/g, "''");
        const websiteUrl = item.url ? item.url.replace(/'/g, "''") : '';
        
        const attrJsonString = JSON.stringify(attributes).replace(/'/g, "''");
        const escapedScheduleJson = scheduleJsonStr.replace(/'/g, "''");
        
        const lat = item.latitude ?? 'NULL';
        const lng = item.longitude ?? 'NULL';

        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, website_url, schedule_json, attributes_json) VALUES ('${serviceId}', 'brand_tullys', NULL, 'free', ${areaId}, '${escapedTitle}', '${escapedAddr}', ${lat}, ${lng}, '${websiteUrl}', '${escapedScheduleJson}', '${attrJsonString}');`;
    }).join('\n');
}

async function main() {
    console.log("🛠 タリーズコーヒーの変換処理を開始します...");

    const mf = new Miniflare({
        d1Databases: { [CONVERTER_CONFIG.D1_BINDING]: CONVERTER_CONFIG.D1_DATABASE_ID },
        modules: true,
        script: `export default { fetch: () => new Response("ok") }`,
        d1Persist: CONVERTER_CONFIG.D1_PERSIST_PATH,
    });

    let areas: AreaMaster[] = [];
    try {
        const db = await mf.getD1Database(CONVERTER_CONFIG.D1_BINDING);
        const res = await db.prepare("SELECT area_id, name FROM areas WHERE area_level = ?").bind(CONVERTER_CONFIG.AREA_LEVEL_TARGET).all();
        
        areas = (res.results || []).map((a: any) => ({
            area_id: a.area_id,
            name: a.name,
            normalizedName: normalizeAddress(a.name)
        })).sort((a, b) => b.name.length - a.name.length);
        
        console.log(`✅ エリア情報を読み込みました。(${areas.length}件)`);
    } catch (error) {
        console.error("❌ エリアマスターの取得に失敗しました。");
        process.exit(1);
    }

    const rawPath = path.join(PATHS.RAW_DATA, CONVERTER_CONFIG.INPUT_FILE);
    if (!fs.existsSync(rawPath)) {
        console.error("❌ 生データが見つかりません: " + rawPath);
        await mf.dispose();
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    
    // SQL生成
    let totalSql = "-- ALETHEIA Tully's Coffee Seed (Area-ID & Schedule Pre-Mapped)\n\n";
    totalSql += convertToSql(rawData, areas);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, CONVERTER_CONFIG.OUTPUT_FILE);
    fs.writeFileSync(outputPath, totalSql);

    console.log(`✅ 合計 ${rawData.length} 件の店舗情報を出力しました。`);
    console.log(`✨ SQLシードが正常に生成されました: ${outputPath}`);
    await mf.dispose();
}

main().catch(console.error);



/**
 * 設計メモ(servicesテーブル)
 * service_id： TLY + 'id'(例： TLY_4780558)
 * brand_id： brand_tullys
 * 
 * area_id： DBより住所の市区町村を判定して、最寄りエリアを設定。
 * 判定できない場合は、00(全国)を設定し、コンソールログに出力。
 * 
 * attributes_json： "Wi-Fi"(739件)、"たばこ"(64件)の文字列を含むかで判定。
 * businessHoursについては、平日の代表時間を一つ選ぶ。
 * 
 * schedule_json： days":["MO","TU","WE","TH","FR","SA","SU"]のように集約すること
 */