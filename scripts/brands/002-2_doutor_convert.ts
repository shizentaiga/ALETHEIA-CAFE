/**
 * ドトール データコンバーター (D1エリア参照)
 * * 使用方法: npx tsx scripts/brands/002-2_doutor_convert.ts
 * * 【主キー生成戦略: service_id の不変性確保】
 * 外部APIコスト最適化のため、再実行時も ID が不変になるよう設計。
 * 1. 優先：電話番号（ハイフン除去のみ）
 * 2. 次点：店名 ＋ 住所 のハッシュ値（電話番号欠損時）
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv'; // .dev.vars 読み込み用
import { Miniflare } from "miniflare";
import { PATHS, CONFIG, ensureDirectory } from '../utils.js';
import { normalizeAddress } from '../../src/lib/searchUtils.js';

/**
 * プロバイダー固有の設定
 */
const CONVERTER_CONFIG = {
    BRAND_ID: 'DOUTOR',
    INPUT_FILE: '002_doutor.json',
    OUTPUT_FILE: '002-1_doutor.sql',
    D1_BINDING: 'ALETHEIA_CAFE_DB',
    D1_DATABASE_ID: '70ed05d4-20d7-484d-bdc1-3a5e9ea63086',
    D1_PERSIST_PATH: '.wrangler/state/v3/d1',
    AREA_LEVEL_TARGET: 3,
    PROCESS_LIMIT: 5000,
};

const envPath = path.resolve(process.cwd(), '.dev.vars');
const env = dotenv.parse(fs.readFileSync(envPath));

interface AreaMaster {
    area_id: string;
    name: string;
    normalizedName: string;
}

function cleanDisplayAddress(str: string) {
    if (!str) return '';
    return str.normalize('NFKC')
              .replace(/[‐－ー—]/g, '-') 
              .replace(/\t/g, ' ')
              .replace(/\r?\n/g, ' ')
              .trim();
}

/**
 * 生のJSONデータをデータベーススキーマ用のSQLに変換します
 */
async function convertToSql(items: any[], areas: AreaMaster[]) {
    const sqlStatements: string[] = [];
    const total = items.length;

    console.log(`🚀 ${total} 件のレコードをSQL変換中...`);

    for (let i = 0; i < total; i++) {
        const item = items[i];
        const lines = item.rawLines || [];
        const rawName = lines[0] || 'ドトールコーヒーショップ';
        const rawAddr = lines[1] || '';
        const phone = lines[2] || '';
        
        const displayAddress = cleanDisplayAddress(rawAddr);
        const comparisonAddress = normalizeAddress(rawAddr);

        const matchedArea = areas.find(area => comparisonAddress.includes(area.normalizedName));
        const areaId = matchedArea ? `'${matchedArea.area_id}'` : 'NULL';

        const latVal = 'NULL';
        const lngVal = 'NULL';

        const businessHours = lines.slice(3).map((l: string) => cleanDisplayAddress(l)).join(' / ');

        // --- 主キー生成ロジック：既存IDとの互換性を重視 ---
        let storeKey: string;
        if (phone && phone.includes('-')) {
            // 電話番号がある場合：ハイフンのみを除去（現在のID形式に合わせる）
            storeKey = phone.replace(/-/g, '');
        } else if (phone && phone.length > 0) {
            // ハイフンがないが電話番号が存在する場合
            storeKey = phone;
        } else {
            // 電話番号がない場合：店名と住所からハッシュを生成
            const seed = `${rawName}_${displayAddress}`;
            storeKey = crypto.createHash('md5').update(seed).digest('hex').slice(0, 12);
        }
        const serviceId = `DTR_${storeKey}`;

        const attributes = {
            category: "cat_cafe",
            wifi: true,
            phone: phone,
            ext_source: "doutor_official",
            ext_place_id: `DTR_OFFICIAL_${storeKey}`,
            business_hours: businessHours || null
        };

        const escapedTitle = rawName.replace(/'/g, "''");
        const escapedAddr = displayAddress.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        const sql = `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.DOUTOR}', '${CONFIG.OWNER_ID}', 'free', ${areaId}, '${escapedTitle}', '${escapedAddr}', ${latVal}, ${lngVal}, '${jsonString}');`;
        sqlStatements.push(sql);

        if ((i + 1) % 50 === 0 || (i + 1) === total) {
            process.stdout.write(`\r⏳ 進捗: ${i + 1} / ${total} 店舗を変換完了...`);
        }
    }
    console.log("\n✅ 変換終了");
    return sqlStatements.join('\n');
}

async function main() {
    console.log("🛠 ドトールの変換処理を開始します...");

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
        
        console.log(`✅ ${areas.length} 件のエリアをロードしました。`);
    } catch (error) {
        console.error("❌ エリアマスターの取得に失敗しました。");
        process.exit(1);
    }

    const rawPath = path.join(PATHS.RAW_DATA, CONVERTER_CONFIG.INPUT_FILE);
    if (!fs.existsSync(rawPath)) {
        console.error("❌ 生データが見つかりません:", rawPath);
        return;
    }
    let rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));

    if (CONVERTER_CONFIG.PROCESS_LIMIT && rawData.length > CONVERTER_CONFIG.PROCESS_LIMIT) {
        console.log(`⚠️ 処理件数を最初の ${CONVERTER_CONFIG.PROCESS_LIMIT} 件に制限します (合計: ${rawData.length} 件)`);
        rawData = rawData.slice(0, CONVERTER_CONFIG.PROCESS_LIMIT);
    }
    
    let totalSql = "-- ALETHEIA Doutor Seed (Area-ID Pre-Mapped, Coordinates to be repaired)\n\n";
    totalSql += await convertToSql(rawData, areas);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, CONVERTER_CONFIG.OUTPUT_FILE);
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQLシードが生成されました: ${outputPath}`);
    await mf.dispose();
}

main().catch(console.error);