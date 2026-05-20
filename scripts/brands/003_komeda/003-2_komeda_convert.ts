/**
 * コメダ珈琲店 データコンバーター (D1エリア参照付きSQL生成)
 * * 使用方法: npx tsx scripts/brands/003-2_komeda_convert.ts
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
    BRAND_ID: 'KOMEDA',
    INPUT_FILE: '003_komeda.json',
    OUTPUT_FILE: '003-1_komeda.sql', // 緯度経度更新前の一次出力SQL
    D1_BINDING: 'ALETHEIA_CAFE_DB',
    D1_DATABASE_ID: '70ed05d4-20d7-484d-bdc1-3a5e9ea63086',
    D1_PERSIST_PATH: '.wrangler/state/v3/d1',
    AREA_LEVEL_TARGET: 3,
    BRAND_PREFIX: 'コメダ珈琲店'
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
        // 店名の前にブランド名を付与
        const rawName = item.name ? `${CONVERTER_CONFIG.BRAND_PREFIX} ${item.name}` : CONVERTER_CONFIG.BRAND_PREFIX;
        
        const rawAddr = item.address || '';
        const komedaId = item.id;
        
        // 保存用の整形住所
        const displayAddress = cleanDisplayAddress(rawAddr);
        // 突合用の正規化住所
        const comparisonAddress = normalizeAddress(rawAddr);

        // --- 全文スキャンによるArea判定（市区町村との紐付け） ---
        const matchedArea = areas.find(area => comparisonAddress.includes(area.normalizedName));
        const areaId = matchedArea ? `'${matchedArea.area_id}'` : 'NULL';

        // サービスIDの生成（Komeda公式のIDを使用）
        const serviceId = `KMD_${komedaId}`;

        // 属性オブジェクト
        const attributes = {
            category: "cat_cafe",
            ext_source: "komeda_official",
            ext_place_id: `KMD_OFFICIAL_${komedaId}`,
            brand_type: item.brand_type || 1
        };

        const escapedTitle = rawName.replace(/'/g, "''");
        const escapedAddr = displayAddress.replace(/'/g, "''");
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        // ※緯度経度は別途更新するため、ここではNULLで出力
        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.KOMEDA}', '${CONFIG.OWNER_ID}', 'free', ${areaId}, '${escapedTitle}', '${escapedAddr}', NULL, NULL, '${jsonString}');`;
    }).join('\n');
}

async function main() {
    console.log("🛠 コメダ珈琲店の変換処理を開始します（D1エリア検索）...");

    const mf = new Miniflare({
        d1Databases: { [CONVERTER_CONFIG.D1_BINDING]: CONVERTER_CONFIG.D1_DATABASE_ID },
        modules: true,
        script: `export default { fetch: () => new Response("ok") }`,
        d1Persist: CONVERTER_CONFIG.D1_PERSIST_PATH,
    });

    let areas: AreaMaster[] = [];
    try {
        const db = await mf.getD1Database(CONVERTER_CONFIG.D1_BINDING);
        // 市区町村レベル（area_level = 3）のマスターを取得
        const res = await db.prepare("SELECT area_id, name FROM areas WHERE area_level = ?").bind(CONVERTER_CONFIG.AREA_LEVEL_TARGET).all();
        
        areas = (res.results || []).map((a: any) => ({
            area_id: a.area_id,
            name: a.name,
            normalizedName: normalizeAddress(a.name)
        })).sort((a, b) => b.name.length - a.name.length); // 名前の長い順にソートして誤判定を防ぐ
        
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
    let totalSql = "-- ALETHEIA Komeda Seed (Area-ID Pre-Mapped)\n\n";
    totalSql += convertToSql(rawData, areas);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, CONVERTER_CONFIG.OUTPUT_FILE);
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQLシードが生成されました: ${outputPath}`);
    await mf.dispose();
}

main().catch(console.error);