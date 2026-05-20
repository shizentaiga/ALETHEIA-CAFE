// Usage: npx tsx scripts/brands/003_komeda/003-4_komeda_schedule_json.ts

import fs from 'fs';
import path from 'path';

const CONFIG = {
    INPUT_FILE1: 'scripts/data/raw/003-2_komeda_detail.json',   // Rowデータ
    INPUT_FILE2: 'src/db/seed/brands/003-3_komeda.sql',         // 緯度経度マージ済みSQL
    OUTPUT_FILE: 'src/db/seed/brands/003-4_komeda.sql',         // 上書き完全版SQL
};

// Rowデータのインターフェース定義
interface KomedaRowShop {
    id: number;
    name: string;
    business_hours: string;
    has_wifi: string;
    has_power: string;
    has_parking: string;
    smoking_status: string;
    shop_services: string;
    payment_methods: string;
}

/**
 * 営業時間のテキストから schedule_json 構造体を生成
 * 例: "7:00～23:00" -> baseスロット生成
 */
function parseSchedule(rawHours: string): any {
    // 予備情報やアナウンスが改行で入っている場合は1行目（基本営業時間）のみを抽出
    const firstLine = rawHours.split('\n')[0].trim();
    const match = firstLine.match(/(\d{1,2}:\d{2})[～-](\d{1,2}:\d{2})/);

    const days = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]; // コメダは原則年中無休枠

    if (match) {
        return {
            base: [
                {
                    days,
                    slots: [{ start: match[1], end: match[2] }]
                }
            ],
            exclude_holidays: false
        };
    }

    // パース失敗時は安全のため空のbaseを返す
    return { base: [{ days, slots: [] }], exclude_holidays: false };
}

async function main() {
    const projectRoot = process.cwd();
    const rowDataPath = path.join(projectRoot, CONFIG.INPUT_FILE1);
    const sqlInputPath = path.join(projectRoot, CONFIG.INPUT_FILE2);
    const sqlOutputPath = path.join(projectRoot, CONFIG.OUTPUT_FILE);

    if (!fs.existsSync(rowDataPath) || !fs.existsSync(sqlInputPath)) {
        console.error(`❌ インプットファイルが見つかりません。`);
        process.exit(1);
    }

    console.log(`⏳ コメダ詳細属性＆スケジュール JSON のマージ処理を開始します...`);

    // 1. Rowデータを読み込んで IDベースのマッピングを作成
    const rowShops: KomedaRowShop[] = JSON.parse(fs.readFileSync(rowDataPath, 'utf-8'));
    const shopMap = new Map<number, KomedaRowShop>();
    rowShops.forEach(shop => shopMap.set(shop.id, shop));

    // 2. 既存のSQLファイルを1行ずつ処理
    const sqlContent = fs.readFileSync(sqlInputPath, 'utf-8');
    const lines = sqlContent.split('\n');
    const updatedLines: string[] = [];
    let updateCount = 0;

    // servicesテーブルの各カラムを安全にキャプチャするための正規表現
    const insertRegex = /^INSERT OR REPLACE INTO services \(([^)]+)\) VALUES \((.+)\);/i;

    for (const line of lines) {
        if (!line.trim() || line.trim().startsWith('--')) {
            updatedLines.push(line);
            continue;
        }

        const match = line.match(insertRegex);
        if (match) {
            const [_, columnsStr, valuesStr] = match;

            // service_id から ID数値を抽出 (例: 'KMD_457' -> 457)
            const idMatch = valuesStr.match(/'KMD_(\d+)'/);
            if (!idMatch) {
                updatedLines.push(line);
                continue;
            }
            const shopId = parseInt(idMatch[1], 10);
            const rowShop = shopMap.get(shopId);

            if (rowShop) {
                // --- 1. カラム定義のアップデート確認 ---
                let updatedColumns = columnsStr.trim();
                if (!updatedColumns.includes('schedule_json')) {
                    updatedColumns += ', schedule_json';
                }

                // --- 2. VALUES のパースと再構築 ---
                // クォーテーションを考慮してカンマで分割（文字列内のカンマで誤分割するのを防ぐ）
                const tokens = valuesStr.split(/,(?=(?:[^']*'[^']*')*[^']*$)/).map(t => t.trim());

                // 💡 変更点①: owner_id を一律 NULL（クォートなし）に書き換え
                // インデックス位置のズレ防止のため、スキーマ構造の3番目 (index: 2) を上書き
                tokens[2] = 'NULL';

                // 既存の attributes_json（末尾の要素）を取得してパース
                const lastIdx = tokens.length - 1;
                let originalAttributes: any = {};
                try {
                    const rawJsonStr = tokens[lastIdx].replace(/^'|'$/g, '').replace(/''/g, "'");
                    originalAttributes = JSON.parse(rawJsonStr);
                } catch (e) {
                    originalAttributes = {};
                }

                // 💡 変更点②: 不要な古いキー（ext_source, ext_place_id, brand_type）を完全に除外
                const { ext_source, ext_place_id, brand_type, ...baseAttributes } = originalAttributes;

                // 💡 変更点③: smoking の判定ロジック変更
                // smoking_status に「喫煙」という文字が含まれている場合のみ true、それ以外は項目自体を省略するか false (スキーマ仕様に基づき true のみセット)
                const isSmokingAllowed = rowShop.smoking_status && rowShop.smoking_status.includes('喫煙');

                // 基本営業時間の1行目を抽出
                const displayHours = rowShop.business_hours.split('\n')[0].trim();

                // 新スキーマに準拠したアトリビュートオブジェクトを厳選して再構築
                const finalAttributes: any = {
                    category: baseAttributes.category || 'cat_cafe',
                    wifi: rowShop.has_wifi !== '' && rowShop.has_wifi !== 'なし',
                    outlets: rowShop.has_power === 'あり',
                    parking: rowShop.has_parking === 'あり',
                    takeout: rowShop.shop_services.includes('お持ち帰り'),
                };

                // smoking が True の場合のみ項目を設定（不要なら出さない、または false）
                if (isSmokingAllowed) {
                    finalAttributes.smoking = true;
                }

                // 残りの必須項目を追加
                finalAttributes.business_hours = displayHours;

                const scheduleObj = parseSchedule(rowShop.business_hours);

                // --- 3. SQL行の組み立て ---
                // attributes_json を新しいものに差し替え (SQLエスケープ対応)
                const attrJsonStr = JSON.stringify(finalAttributes).replace(/'/g, "''");
                tokens[lastIdx] = `'${attrJsonStr}'`;

                // schedule_json を末尾に追加
                const schedJsonStr = JSON.stringify(scheduleObj).replace(/'/g, "''");
                const finalValuesStr = tokens.join(', ') + `, '${schedJsonStr}'`;

                const updatedLine = `INSERT OR REPLACE INTO services (${updatedColumns}) VALUES (${finalValuesStr});`;
                updatedLines.push(updatedLine);
                updateCount++;
            } else {
                updatedLines.push(line);
            }
        } else {
            updatedLines.push(line);
        }
    }

    // 3. ファイル上書き書き込み
    fs.writeFileSync(sqlOutputPath, updatedLines.join('\n'), 'utf-8');

    const relativeOutputPath = path.relative(projectRoot, sqlOutputPath);
    console.log(`\n✨ スケジュール＆詳細属性のマージが完了しました！`);
    console.log(`💾 保存先: ${relativeOutputPath} (処理成功: ${updateCount} 件)`);
}

main().catch(err => {
    console.error("❌ 致命的なエラー:", err);
    process.exit(1);
});