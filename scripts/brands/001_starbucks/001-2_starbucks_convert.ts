/**
 * スターバックス データコンバーター (D1エリア参照付きSQL生成)
 * * 使用方法: npx tsx scripts/brands/001-2_starbucks_convert.ts
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
    BRAND_ID: 'STARBUCKS',
    INPUT_FILE: '001_starbucks.json',
    OUTPUT_FILE: '001-1_starbucks.sql',
    D1_BINDING: 'ALETHEIA_CAFE_DB',
    D1_DATABASE_ID: '70ed05d4-20d7-484d-bdc1-3a5e9ea63086',
    D1_PERSIST_PATH: '.wrangler/state/v3/d1',
    AREA_LEVEL_TARGET: 3
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
 * 生のAPIフィールドをデータベーススキーマにマップします。
 */
function convertToSql(hits: any[], areas: AreaMaster[]) {
    return hits.map(hit => {
        const f = hit.fields;
        const storeId = f.store_id;
        const serviceId = `STB_${storeId}`;
        
        // 1. DB保存用の住所 (表示用データは元データを尊重)
        // 全角スペースを半角にする程度の最小限の整形のみ行う
        const rawAddress = f.address_5 || '';
        const displayAddress = rawAddress.replace(/　/g, ' ').trim();

        // 2. 比較（突合）用の正規化住所
        // これを基準にエリア判定を行うが、SQLには出力しない
        const comparisonAddress = normalizeAddress(rawAddress);
        
        // --- 全文スキャンによるArea判定 ---
        // 比較用データ (comparisonAddress) を使用して判定
        const matchedArea = areas.find(area => comparisonAddress.includes(area.normalizedName));
        const areaId = matchedArea ? `'${matchedArea.area_id}'` : 'NULL';
        
        // 座標
        const [lat, lng] = f.location ? f.location.split(',') : ['NULL', 'NULL'];
        
        // 属性オブジェクト
        const attributes = {
            category: "cat_cafe",
            wifi: f.public_wireless_service_flg === "1",
            ext_source: "starbucks_official",
            ext_place_id: `STB_OFFICIAL_${storeId}`,
            business_hours: f.business_day_mon_thu || null 
        };

        const escapedTitle = `スターバックス コーヒー ${f.name}`.replace(/'/g, "''");
        const escapedAddress = displayAddress.replace(/'/g, "''"); // 保存にはdisplayAddressを使用
        const jsonString = JSON.stringify(attributes).replace(/'/g, "''");

        // pref, city を削除したテーブル構造に合わせて出力
        return `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json) VALUES ('${serviceId}', '${CONFIG.BRANDS.STARBUCKS}', '${CONFIG.OWNER_ID}', 'free', ${areaId}, '${escapedTitle}', '${escapedAddress}', ${lat}, ${lng}, '${jsonString}');`;
    }).join('\n');
}

async function main() {
    console.log("🛠 スターバックスの変換処理を開始します（D1エリア検索）...");

    // 1. MiniflareでD1にアクセス
    const mf = new Miniflare({
        d1Databases: { [CONVERTER_CONFIG.D1_BINDING]: CONVERTER_CONFIG.D1_DATABASE_ID },
        modules: true,
        script: `export default { fetch: () => new Response("ok") }`,
        d1Persist: CONVERTER_CONFIG.D1_PERSIST_PATH, 
    });

    let areas: AreaMaster[] = [];
    try {
        const db = await mf.getD1Database(CONVERTER_CONFIG.D1_BINDING);
        console.log("⏳ D1からエリアマスターを取得中...");
        const res = await db.prepare("SELECT area_id, name FROM areas WHERE area_level = ?").bind(CONVERTER_CONFIG.AREA_LEVEL_TARGET).all();
        
        areas = (res.results || []).map((a: any) => ({
            area_id: a.area_id,
            name: a.name,
            normalizedName: normalizeAddress(a.name) // エリア名も比較用に正規化
        })).sort((a, b) => b.name.length - a.name.length);
        
        console.log(`✅ ${areas.length} 件のエリアをロードしました。`);
    } catch (error) {
        console.error("❌ D1へのアクセスに失敗しました。");
        process.exit(1);
    }

    // 2. 元データのJSONを読み込み
    const rawPath = path.join(PATHS.RAW_DATA, CONVERTER_CONFIG.INPUT_FILE);
    if (!fs.existsSync(rawPath)) {
        console.error("❌ 生データが見つかりません:", rawPath);
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));

    // 3. SQL生成
    let totalSql = "-- ALETHEIA Starbucks Seed (Area-ID Pre-Mapped)\n";
    totalSql += "-- Note: address is display-friendly, area_id is matched using normalization.\n\n";
    totalSql += convertToSql(rawData, areas);

    ensureDirectory(PATHS.DB_SEED);
    const outputPath = path.join(PATHS.DB_SEED, CONVERTER_CONFIG.OUTPUT_FILE);
    fs.writeFileSync(outputPath, totalSql);

    console.log(`\n✨ SQLシードが生成されました: ${outputPath}`);
    console.log(`📊 総レコード数: ${rawData.length}`);

    await mf.dispose();
}

main().catch(console.error);