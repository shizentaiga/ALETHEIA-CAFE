// Usage: npx tsx scripts/brands/003-4_komeda_schedule_json.ts

import fs from 'fs';
import path from 'path';

const CONFIG = {
    INPUT_FILE1: 'scripts/data/raw/003-2_komeda_detail.json',   // Rowデータ
    INPUT_FILE2: 'src/db/seed/brands/003-3_komeda.sql',        // 緯度経度マージ済みSQL
    OUTPUT_FILE: 'src/db/seed/brands/003-4_komeda.sql',        // 上書き完全版SQL
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

/**
 * 喫煙ステータスのマッピング
 */
function parseSmoking(status: string): string {
    if (!status) return 'NO_SMOKING';
    if (status.includes('全席禁煙')) return 'NO_SMOKING';
    if (status.includes('喫煙専用室')) return 'SMOKING_ROOM';
    if (status.includes('分煙') || status.includes('喫煙席あり')) return 'SMOKING_SEATS';
    if (status.includes('全席喫煙')) return 'ALL_SMOKING';
    return 'NO_SMOKING'; // フォールバック
}

/**
 * 決済方法の文字列から標準化配列を生成
 */
function parsePayment(methods: string): string[] {
    if (!methods) return [];
    const tokens: string[] = [];

    // 'CASH_ONLY' 判定：もし決済方法が空か「現金」のみなら入れる（コメダは基本キャッシュレス対応なので基本入らない）
    if (methods.includes('クレジットカード')) tokens.push('CREDIT');
    if (methods.includes('電子マネー')) tokens.push('E_MONEY');
    
    // コード決済が含まれる場合、日本市場の最重要トークン 'PayPay' と汎用 'QR' をセットで注入
    if (methods.includes('コード決済')) {
        tokens.push('PayPay');
        tokens.push('QR');
    }

    return Array.from(new Set(tokens)); // 重複排除
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
    // 最後に schedule_json を追加するため、INTO と VALUES の構造をバラす
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
                // --- カラム定義のアップデート（schedule_json の追加） ---
                let updatedColumns = columnsStr.trim();
                if (!updatedColumns.includes('schedule_json')) {
                    updatedColumns += ', schedule_json';
                }

                // --- VALUES のパースと再構築 ---
                // クォーテーションを考慮してカンマで分割
                const tokens = valuesStr.split(/,(?=(?:[^']*'[^']*')*[^']*$)/);

                // 既存の attributes_json（最後の要素）を取得してパース
                const lastIdx = tokens.length - 1;
                let originalAttributes: any = {};
                try {
                    // シングルクォーテーションを剥ぎ取ってJSONパース
                    const rawJsonStr = tokens[lastIdx].trim().replace(/^'|'$/g, '');
                    originalAttributes = JSON.parse(rawJsonStr);
                } catch (e) {
                    originalAttributes = {};
                }

                // --- 新スキーマに基くデータの生成 ---
                const scheduleObj = parseSchedule(rowShop.business_hours);
                
                // 基本営業時間の1行目を抽出
                const displayHours = rowShop.business_hours.split('\n')[0].trim();

                // 既存のオブジェクトに厳選された新属性をマージ
                const newAttributes = {
                    ...originalAttributes,
                    wifi: rowShop.has_wifi !== '' && rowShop.has_wifi !== 'なし',
                    outlets: rowShop.has_power === 'あり',
                    parking: rowShop.has_parking === 'あり',
                    takeout: rowShop.shop_services.includes('お持ち帰り'),
                    smoking: parseSmoking(rowShop.smoking_status),
                    payment: parsePayment(rowShop.payment_methods),
                    buffet: false,
                    baby: null,
                    business_hours: displayHours // 予備・表示用アトリビュート
                };

                // --- SQL行の組み立て ---
                // attributes_json を更新
                tokens[lastIdx] = `'${JSON.stringify(newAttributes)}'`;

                // schedule_json を末尾に追加
                const finalValuesStr = tokens.join(',') + `, '${JSON.stringify(scheduleObj)}'`;

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