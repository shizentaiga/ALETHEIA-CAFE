// Usage: npx tsx scripts/brands/004-4_misdo_convert_detail.ts

import fs from 'fs';
import path from 'path';

const CONFIG = {
    INPUT_FILE1: 'scripts/data/raw/004_misdo.json',             // 大まかなRowデータ(食べ放題など)
    INPUT_FILE2: 'scripts/data/raw/004-2_misdo_detail.json',    // 詳細なRowデータ(営業時間など)
    INPUT_FILE3: 'src/db/seed/brands/004-1_misdo.sql',          // エリアIDを取得
    OUTPUT_FILE: 'src/db/seed/brands/004-4_misdo.sql',          // 完成版のSQL
};

// 決済配列を厳選ルールに従って組み立てるヘルパー
function buildPaymentArray(detail: any): string[] {
    const payments: string[] = [];

    if (detail.credit_flg === "1") payments.push("CREDIT");
    
    // 電子マネーの集約判定
    if (
        detail.transport_money === "1" || 
        detail.rakutenedy_money === "1" || 
        detail.id_money === "1" || 
        detail.waon_money === "1" || 
        detail.nanaco_money === "1"
    ) {
        payments.push("E_MONEY");
    }

    // QR決済の集約判定
    if (
        detail.paypay_flg === "1" || 
        detail.dpay_flg === "1" || 
        detail.aupay_flg === "1" || 
        detail.rpay_flg === "1" || 
        detail.merpay_flg === "1"
    ) {
        payments.push("QR");
    }

    // 個別許可キー
    if (detail.paypay_flg === "1") {
        payments.push("PayPay");
    }

    if (payments.length === 0) {
        payments.push("CASH_ONLY");
    }

    return payments;
}

// 喫煙ステータスのマッピング
function determineSmokingStatus(detail: any, raw1: any): string {
    // 1はマピオン側で「禁煙」または「何かしらのステータスあり」のケースが多い
    if (detail.smoke_flg === "1") {
        const listStatus = raw1?.services?.smoking_status;
        if (listStatus === "全席禁煙") return "NO_SMOKING";
        if (listStatus === "喫煙専用室あり") return "SMOKING_ROOM";
        return "NO_SMOKING"; // 安全側に倒す
    }
    return "NO_SMOKING";
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
    
    // 💡 【追加】ベースSQLから既存のarea_idを一本釣りするための事前パースロジック
    const baseSqlContent = fs.readFileSync(CONFIG.INPUT_FILE3, 'utf-8');
    const areaMap = new Map<string, string>();
    
    // VALUES の中から ('service_id', ..., 'area_id', ...) を高精度に抽出する正規表現
    // 例: ('MSD_0742', 'brand_misterdonuts', '01ARZ...', 'free', '10-10-A001',
    const insertRegex = /VALUES\s*\(\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*'([^']+)'/gi;
    let match;
    while ((match = insertRegex.exec(baseSqlContent)) !== null) {
        const serviceId = match[1];
        const areaId = match[2];
        areaMap.set(serviceId, areaId);
    }

    // 詳細データをIDをキーにしたマップに変換（高速ルックアップ用）
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

        // --- A. schedule_json の構築（時間文字列のクレンジングを含む） ---
        // 営業時間の生データに紛れ込む <br> や「土日祝〜」といった文字ノイズを排除し、純粋な HH:MM だけを抽出
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

        // --- B. attributes_json の構築 (厳選スキーマ規約) ---
        // フロント表示用の business_hours からはHTMLタグだけをきれいに除去
        const cleanBusinessHours = (detail.sales_time1 || `${openTime}～${closeTime}`).replace(/<br\s*\/?>/gi, " ");

        const attributesObj = {
            category: "cat_cafe",
            wifi: shop.raw_icons?.some((s: string) => s.includes('Wi-Fi')) || false,
            outlets: false, // ミスドは原則電源開放していないため一律false
            parking: detail.com_park_flg === "1" || shop.services?.has_parking || false,
            takeout: true,  // ミスドは全店テイクアウト対応
            smoking: determineSmokingStatus(detail, shop),
            payment: buildPaymentArray(detail),
            // 【修正】確実性の高い 004_misdo.json (shop.services) のアイコン判定のみを根拠とする
            buffet: shop.services?.has_buffet === true,
            pop_buffet: shop.services?.has_pop_buffet === true,
            free_refill: true, // イートイン可能な通常店は一律提供のためtrue
            baby: false,
            business_hours: cleanBusinessHours
        };
        const attributesJson = JSON.stringify(attributesObj);

        // --- C. 各フィールドのバインド ---
        const serviceId = `MSD_${shop.id}`;
        const brandId = "brand_misterdonuts";
        const ownerId = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
        const planId = "free";
        
        // 💡 【修正】事前に INPUT_FILE3 からパースしたマップからエリアIDを引き当てる。
        // 万が一、マップに存在しない場合は安全装置（フォールバック）として '10-10-A001' を適用
        const areaId = areaMap.get(serviceId) || "10-10-A001";
        
        // シングルクォーテーションのパース考慮（店名の表記揺れ・エスケープ対応）
        const escapedTitle = `ミスタードーナツ ${shop.name.replace("ミスタードーナツ", "").trim()}`.replace(/'/g, "''");
        const escapedAddress = (detail.full_address || shop.address).replace(/'/g, "''");
        const lat = detail.latitude ? parseFloat(detail.latitude) : shop.location.lat;
        const lng = detail.longitude ? parseFloat(detail.longitude) : shop.location.lng;

        // SQL文の生成 (schedule_jsonカラムを追加)
        const sql = `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, schedule_json, attributes_json) VALUES ('${serviceId}', '${brandId}', '${ownerId}', '${planId}', '${areaId}', '${escapedTitle}', '${escapedAddress}', ${lat}, ${lng}, '${scheduleJson}', '${attributesJson}');`;
        
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