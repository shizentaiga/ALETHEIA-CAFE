/**
 * ミスタードーナツ データコンバーター (D1エリア参照付きSQL生成)
 * * 使用方法: npx tsx scripts/brands/004_misterdonut/004-2_misdo_convert.ts
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
    BRAND_ID: 'MISTERDONUTS',
    INPUT_FILE: '004_misdo.json',
    OUTPUT_FILE: '004-1_misdo.sql', // 最終出力用SQL
    D1_BINDING: 'ALETHEIA_CAFE_DB',
    D1_DATABASE_ID: '70ed05d4-20d7-484d-bdc1-3a5e9ea63086',
    D1_PERSIST_PATH: '.wrangler/state/v3/d1',
    AREA_LEVEL_TARGET: 3,
    BRAND_PREFIX: 'ミスタードーナツ'
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
 * 住所のクリーニング
 */
function cleanDisplayAddress(str: string) {
    if (!str) return '';
    return str.replace(/\t/g, ' ').replace(/　/g, ' ').replace(/\r?\n/g, ' ').trim();
}

/**
 * 生のAPIデータをデータベーススキーマ用のSQLに変換します
 */
function convertToSql(items: any[], areas: AreaMaster[]) {
    return items.map((item) => {
        // ブランド名を冠した店名（例: ミスタードーナツ けやきウォーク前橋 ショップ）
        const rawName = item.name ? `${CONVERTER_CONFIG.BRAND_PREFIX} ${item.name}` : CONVERTER_CONFIG.BRAND_PREFIX;
        
        const rawAddr = item.address || '';
        const mdId = item.id;
        
        const displayAddress = cleanDisplayAddress(rawAddr);
        const comparisonAddress = normalizeAddress(rawAddr);

        // Area判定（市区町村との紐付け）
        const matchedArea = areas.find(area => comparisonAddress.includes(area.normalizedName));
        const areaId = matchedArea ? `'${matchedArea.area_id}'` : 'NULL';

        // サービスIDの生成
        const serviceId = `MSD_${mdId}`;

        // schema.sqlの仕様に基づき attributes_json を構成
        const attributes = {
            category: "cat_cafe",
            wifi: item.raw_icons?.some((s: string) => s.includes('Wi-Fi')) || false,
            outlets: false, // スクレイピング項目にないためデフォルトfalse
            business_hours: "", // Rawデータに含まれないため空文字
            payment: [], // 後の拡張用
            buffet: item.services?.has_buffet || false, // ドーナツビュッフェ
            baby: false, // 後の拡張用
            pop_buffet: item.services?.has_pop_buffet || false // ドーナツポップつめ放題
        };

        const escapedTitle = rawName.replace(/'/g, "''");
        const escapedAddr = displayAddress.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");
        
        const lat = item.location?.lat ?? 'NULL';
        const lng = item.location?.lng ?? 'NULL';

        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.MISTERDONUTS}', '${CONFIG.OWNER_ID}', 'free', ${areaId}, '${escapedTitle}', '${escapedAddr}', ${lat}, ${lng}, '${jsonString}');`;
    }).join('\n');
}

async function main() {
    console.log("🛠 ミスタードーナツの変換処理を開始します（D1エリア検索）...");

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
        console.error("❌ 生データが見つかりません: " + rawPath);
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    
    // SQL生成
    let totalSql = "-- ALETHEIA Mister Donuts Seed (Area-ID Pre-Mapped)\n\n";
    totalSql += convertToSql(rawData, areas);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, CONVERTER_CONFIG.OUTPUT_FILE);
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQLシードが生成されました: ${outputPath}`);
    await mf.dispose();
}

main().catch(console.error);