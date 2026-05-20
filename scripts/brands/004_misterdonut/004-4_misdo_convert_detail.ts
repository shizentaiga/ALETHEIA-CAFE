// Usage: npx tsx scripts/brands/004_misterdonut/004-4_misdo_convert_detail.ts

import fs from 'fs';
import path from 'path';

const CONFIG = {
    INPUT_FILE1: 'scripts/data/raw/004_misdo.json',             // 大まかなRowデータ(食べ放題など)
    INPUT_FILE2: 'scripts/data/raw/004-2_misdo_detail.json',    // 詳細なRowデータ(営業時間など)
    INPUT_FILE3: 'src/db/seed/brands/004-1_misdo.sql',          // エリアIDを取得
    OUTPUT_FILE: 'src/db/seed/brands/004-4_misdo.sql',          // 完成版のSQL
};

// 喫煙ステータスのマッピング修正
// 要件: smoke_flgが "2" の場合のみ smoking を true にする
function determineSmokingStatus(detail: any): boolean {
    return detail.smoke_flg === "2";
}

async function main() {
    console.log("🚀 ミスタードーナツのデータ統合 & SQLコンバートを開始します...");

    // 1. ファイルの存在チェックと読み込み
    if (!fs.existsSync(CONFIG.INPUT_FILE1) || !fs.existsSync(CONFIG.INPUT_FILE2) || !fs.existsSync(CONFIG.INPUT_FILE3)) {
        console.error("❌ インプットファイルが存在しません。パスを確認してください。");
        process.exit(1);
    }

    const rawData1 = JSON.parse(fs.readFileSync(CONFIG.INPUT_FILE1, 'utf-8'));
    const rawData2 = JSON.parse(fs.readFileSync(CONFIG.INPUT_FILE2, 'utf-8'));
    
    // ベースSQLから既存のarea_idを一本釣りするための事前パースロジック
    const baseSqlContent = fs.readFileSync(CONFIG.INPUT_FILE3, 'utf-8');
    const areaMap = new Map<string, string>();
    
    // VALUES の中から ('service_id', ..., 'area_id', ...) を抽出
    // ※owner_idの位置のパース揺れに影響されないよう正規表現を最適化
    const insertRegex = /VALUES\s*\(\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*[^,]+\s*,\s*'[^']+'\s*,\s*'([^']+)'/gi;
    let match;
    while ((match = insertRegex.exec(baseSqlContent)) !== null) {
        const serviceId = match[1];
        const areaId = match[2];
        areaMap.set(serviceId, areaId);
    }

    // 詳細データをIDをキーにしたマップに変換
    const detailMap = new Map<string, any>();
    for (const detail of rawData2) {
        detailMap.set(detail.id, detail);
    }

    const sqlLines: string[] = [];
    let mergedCount = 0;

    // 2. 概要データをベースに詳細データをマージしながらループ
    for (const shop of rawData1) {
        const detail = detailMap.get(shop.id);
        if (!detail) {
            console.warn(`⚠️ 詳細データに見つからない店舗IDがあります: ${shop.id} (${shop.name})`);
            continue;
        }

        // --- A. schedule_json の構築 ---
        const openTime = (detail.open_time || "10:00").match(/\d{1,2}:\d{2}/)?.[0] || "10:00";
        const closeTime = (detail.close_time || "21:00").match(/\d{1,2}:\d{2}/)?.[0] || "21:00";

        const scheduleObj = {
            base: [
                {
                    days: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"],
                    slots: [{ start: openTime, end: closeTime }]
                }
            ],
            exclude_holidays: false
        };
        const scheduleJson = JSON.stringify(scheduleObj);

        // --- B. attributes_json の構築 ---
        const cleanBusinessHours = (detail.sales_time1 || `${openTime}～${closeTime}`).replace(/<br\s*\/?>/gi, " ");

        const attributesObj = {
            category: "cat_cafe",
            wifi: shop.raw_icons?.some((s: string) => s.includes('Wi-Fi')) || false,
            // outlets: false, 
            parking: detail.com_park_flg === "1" || shop.services?.has_parking || false,
            // takeout: true,  
            smoking: determineSmokingStatus(detail), // true / false の boolean 出力
            // 【変更】payment 配列は要件に基づき全面削除
            buffet: shop.services?.has_buffet === true,
            pop_buffet: shop.services?.has_pop_buffet === true,
            // free_refill: true, 
            // baby: false,
            business_hours: cleanBusinessHours
        };
        const attributesJson = JSON.stringify(attributesObj);

        // --- C. 各フィールドのバインドとクレンジング ---
        const serviceId = `MSD_${shop.id}`;
        const brandId = "brand_misterdonuts";
        const planId = "free";
        const areaId = areaMap.get(serviceId) || "10-10-A001";
        
        // 店名・住所のエスケープ
        const escapedTitle = `ミスタードーナツ ${shop.name.replace("ミスタードーナツ", "").trim()}`.replace(/'/g, "''");
        const escapedAddress = (detail.full_address || shop.address).replace(/'/g, "''");
        const lat = detail.latitude ? parseFloat(detail.latitude) : shop.location.lat;
        const lng = detail.longitude ? parseFloat(detail.longitude) : shop.location.lng;

        // 【変更】website_url の組み立て (detail.url から取得してエスケープ)
        const rawUrl = detail.url || "";
        const websiteUrlValue = rawUrl ? `'${rawUrl.replace(/'/g, "''")}'` : 'NULL';

        // SQL文の生成 (website_url カラムを lat, lng の後に追加、owner_id は生の NULL に変更)
        const sql = `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, website_url, schedule_json, attributes_json) VALUES ('${serviceId}', '${brandId}', NULL, '${planId}', '${areaId}', '${escapedTitle}', '${escapedAddress}', ${lat}, ${lng}, ${websiteUrlValue}, '${scheduleJson}', '${attributesJson}');`;
        
        sqlLines.push(sql);
        mergedCount++;
    }

    // 3. SQLファイルの書き出し
    const outputDir = path.dirname(CONFIG.OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG.OUTPUT_FILE, sqlLines.join('\n') + '\n', 'utf-8');

    console.log(`\n✨ コンバート完了しました！`);
    console.log(`📊 処理件数: ${mergedCount} 件`);
    console.log(`💾 出力先: ${CONFIG.OUTPUT_FILE}`);
}

main().catch(err => {
    console.error("❌ 変換処理中に致命的なエラーが発生しました:", err);
    process.exit(1);
});