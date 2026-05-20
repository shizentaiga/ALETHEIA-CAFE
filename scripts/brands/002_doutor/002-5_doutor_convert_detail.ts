// Usage: npx tsx scripts/brands/002_doutor/002-5_doutor_convert_detail.ts

import fs from 'fs';
import path from 'path';

const CONFIG = {
    INPUT_FILE1: 'scripts/data/raw/002-2_doutor_detail.json',   // 詳細なRowデータ
    INPUT_FILE2: 'src/db/seed/brands/002-4_doutor.sql',         // エリアID/固定ID取得済み
    OUTPUT_FILE: 'src/db/seed/brands/002-5_doutor.sql',         // 完成版のSQL
};

// 既存SQLから抜き出すメタ情報
interface ExistingMeta {
    service_id: string;
    brand_id: string;
    owner_id: string;
    plan_id: string;
    area_id: string;
}

function cleanDisplayAddress(str: string) {
    if (!str) return '';
    return str.normalize('NFKC')
              .replace(/[‐－]/g, '-')    // 住所の番地で使われる全角ハイフン・マイナスだけを半角に（「ー」は除外）
              .replace(/\t/g, ' ')      // タブを半角スペースに
              .replace(/\r?\n/g, ' ')   // 改行を半角スペースに
              .trim();                  // 先頭と末尾の空白を削除
}

// 店舗名をキーにして既存のメタ情報を引けるようにパース
function parseExistingSql(sqlPath: string): Map<string, ExistingMeta> {
    const titleToMetaMap = new Map<string, ExistingMeta>();
    if (!fs.existsSync(sqlPath)) {
        console.warn(`⚠️ 警告: ${sqlPath} が見つかりません。デフォルト値を使用します。`);
        return titleToMetaMap;
    }

    const content = fs.readFileSync(sqlPath, 'utf-8');
    const lines = content.split('\n');

    // VALUES句から各フィールドを確実に抽出する正規表現
    // 1:service_id, 2:brand_id, 3:owner_id, 4:plan_id, 5:area_id, 6:title
    const regex = /VALUES\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/;

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            const [_, service_id, brand_id, owner_id, plan_id, area_id, title] = match;
            // 比較しやすくするため、既存SQL内のエスケープされたシングルクォートを戻す
            const cleanTitle = title.replace(/''/g, "'");
            titleToMetaMap.set(cleanTitle, { service_id, brand_id, owner_id, plan_id, area_id });
        }
    }
    return titleToMetaMap;
}

function main() {
    console.log('🚀 ドトール詳細データのコンバート処理を開始します...');

    // 1. 既存SQLから「店舗名 -> メタ情報」のマッピングを読み込み
    const titleToMetaMap = parseExistingSql(CONFIG.INPUT_FILE2);

    // 2. 新しい詳細RAWデータ（File1）の読み込み
    if (!fs.existsSync(CONFIG.INPUT_FILE1)) {
        console.error(`❌ エラー: 入力ファイル1 (${CONFIG.INPUT_FILE1}) が見つかりません。`);
        process.exit(1);
    }
    const rawData = JSON.parse(fs.readFileSync(CONFIG.INPUT_FILE1, 'utf-8'));

    const sqlLines: string[] = [];
    sqlLines.push('-- =============================================================================');
    sqlLines.push('-- Generated Service Seed Data (Doutor Coffee Shop Detailed)');
    sqlLines.push('-- =============================================================================');

    for (const shop of rawData) {
        const info = shop.shop_info;
        if (!info) continue;

        const shopCode = info.shop_code || shop.id;
        const currentTitle = info.name.trim();
        
        // デフォルトのフォールバック値（既存SQLに存在しない新規店舗用）
        let service_id = `DTR_${shopCode}`;
        let meta = {
            brand_id: 'brand_doutor',
            owner_id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
            plan_id: 'free',
            area_id: '01-V40-A041' // 一応のデフォルト（北海道等）
        };

        // 既存SQL（店舗名キー）から完全一致でメタ情報を引き当てる
        if (titleToMetaMap.has(currentTitle)) {
            const existing = titleToMetaMap.get(currentTitle)!;
            service_id = existing.service_id;
            meta = {
                brand_id: existing.brand_id,
                owner_id: existing.owner_id,
                plan_id: existing.plan_id,
                area_id: existing.area_id
            };
        } else {
            console.log(`💡 新規または名称変更店舗を検出: ${currentTitle} (Code: ${shopCode}) -> 新規IDを採番します`);
        }

        // 3. 喫煙ポリシーの判定
        const facilities = shop.facilities || {};
        const isSmokingAllowed = 
            (facilities.smoking_policy && facilities.smoking_policy.includes('喫煙')) || 
            (facilities.seats_smoking && parseInt(facilities.seats_smoking, 10) >= 1) ? true : false;

        // 4. 代表営業時間の抽出
        const hours = shop.business_hours || {};
        const weekdayTime = hours.weekday?.time || '09:00-19:00';

        // 5. dynamic attributes json の構築 (スキーマ定義のキーに厳選)
        const attributes = {
            category: 'cat_cafe',
            wifi: !!facilities.wifi,
            outlets: !!facilities.outlet,
            smoking: isSmokingAllowed,
            business_hours: weekdayTime
        };

        // 6. schedule_json の構築 (iCalendar-based)
        const timeMatch = weekdayTime.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
        const startSlot = timeMatch ? timeMatch[1] : '09:00';
        const endSlot = timeMatch ? timeMatch[2] : '19:00';

        const schedule = {
            base: [
                {
                    days: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
                    slots: [{ start: startSlot, end: endSlot }]
                }
            ],
            exclude_holidays: false
        };

        // 住所のクレンジング処理を適用
        const cleanedAddress = cleanDisplayAddress(info.address);

        // 7. SQLエスケープ処理
        const escapedTitle = currentTitle.replace(/'/g, "''");
        const escapedAddress = cleanedAddress.replace(/'/g, "''");
        const attrJsonStr = JSON.stringify(attributes).replace(/'/g, "''");
        const schedJsonStr = JSON.stringify(schedule).replace(/'/g, "''");
        const websiteUrl = shop.url || '';

        // 8. SQL文の組み立て
        const sql = `INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, website_url, attributes_json, schedule_json) VALUES ('${service_id}', '${meta.brand_id}', '${meta.owner_id}', '${meta.plan_id}', '${meta.area_id}', '${escapedTitle}', '${escapedAddress}', ${info.lat || 'NULL'}, ${info.lon || 'NULL'}, '${websiteUrl}', '${attrJsonStr}', '${schedJsonStr}');`;
        
        sqlLines.push(sql);
    }

    // ディレクトリ作成と書き込み
    const outputDir = path.dirname(CONFIG.OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG.OUTPUT_FILE, sqlLines.join('\n'), 'utf-8');
    console.log(`\n✨ コンバートが完了しました！`);
    console.log(`出力ファイル: ${CONFIG.OUTPUT_FILE} (合計レコード数: ${rawData.length} 件)`);
}

main();