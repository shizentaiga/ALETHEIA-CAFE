// Usage: npx tsx scripts/brands/002-4_doutor_schedule_json.ts

// 注意点：平日営業時間 備考 休業:毎週月曜日などは対応していない。(合計80件ほど。)

import fs from 'fs';
import path from 'path';

const PATH_CONFIG = {
    INPUT_SQL: 'src/db/seed/brands/002-1_doutor.sql',
    OUTPUT_SQL: 'src/db/seed/brands/002-4_doutor.sql'
};

/**
 * 同じ時間帯のスロットを持つ曜日をマージして軽量化する
 */
function optimizeSchedule(baseSlots: any[]): any[] {
    const mergedSlots: any[] = [];

    for (const current of baseSlots) {
        const currentSlotStr = JSON.stringify(current.slots);
        const existing = mergedSlots.find(item => JSON.stringify(item.slots) === currentSlotStr);

        if (existing) {
            existing.days = [...existing.days, ...current.days];
        } else {
            mergedSlots.push({
                days: [...current.days],
                slots: JSON.parse(currentSlotStr)
            });
        }
    }

    return mergedSlots;
}

/**
 * 営業時間の文字列を schedule_json 構造に変換 (ドトール特化型)
 */
function parseBusinessHours(rawStr: string | null): any {
    const defaultSchedule = { base: [] };
    if (!rawStr) return defaultSchedule;

    const normalized = rawStr.replace(/：/g, ':').replace(/～/g, '-').replace(/\s/g, '');
    const segments = normalized.split('/');
    const baseSlots: any[] = [];

    for (const segment of segments) {
        if (segment.includes('備考') || segment.includes('ラスト')) {
            continue;
        }

        const match = segment.match(/(平日|土曜|日祝)営業時間(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
        if (match) {
            const type = match[1];
            const start = match[2].padStart(5, '0');
            const end = match[3].padStart(5, '0');

            let days: string[] = [];
            if (type === '平日') {
                days = ["MO", "TU", "WE", "TH", "FR"];
            } else if (type === '土曜') {
                days = ["SA"];
            } else if (type === '日祝') {
                days = ["SU"];
            }

            if (days.length > 0) {
                baseSlots.push({
                    days: days,
                    slots: [{ start, end }]
                });
            }
        }
    }

    if (baseSlots.length > 0) {
        const optimizedSlots = optimizeSchedule(baseSlots);
        return {
            base: optimizedSlots,
            exclude_holidays: false
        };
    }

    console.warn(`  ⚠️ パース失敗: "${rawStr}" は標準形式ではないため空で出力します。`);
    return defaultSchedule;
}

/**
 * 複雑な営業時間から「平日の代表時間のみ」を抽出する
 * 例: "平日営業時間 09:00-19:00 / 土曜..." -> "09:00-19:00"
 */
function extractWeekdayHours(rawStr: string | null): string {
    if (!rawStr) return "";
    
    // 表記揺れを吸収しつつ「平日営業時間」の直後の時間帯をキャプチャ
    const normalized = rawStr.replace(/：/g, ':').replace(/～/g, '-');
    const match = normalized.match(/平日営業時間\s*(\d{1,2}:\d{2}-\d{1,2}:\d{2})/);
    
    if (match) {
        // 時刻のパディング調整 (例: 7:00-21:00 -> 07:00-21:00)
        const times = match[1].split('-');
        const start = times[0].trim().padStart(5, '0');
        const end = times[1].trim().padStart(5, '0');
        return `${start}-${end}`;
    }
    
    return rawStr; // マッチしなかった特殊型（休業備考つき等）は安全のため元の文字列を返す
}

async function main() {
    console.log("🚀 ドトール schedule_json の生成および business_hours のシンプル化を開始します...");

    const inputPath = path.resolve(PATH_CONFIG.INPUT_SQL);
    const outputPath = path.resolve(PATH_CONFIG.OUTPUT_SQL);

    if (!fs.existsSync(inputPath)) {
        console.error("❌ インプットSQLが見つかりません:", inputPath);
        return;
    }

    const sqlContent = fs.readFileSync(inputPath, 'utf-8');
    const lines = sqlContent.split('\n');
    const newLines: string[] = [];

    let processedCount = 0;

    for (let line of lines) {
        if (!line.startsWith('INSERT OR REPLACE')) {
            newLines.push(line);
            continue;
        }

        const attrMatch = line.match(/'({.*})'\);/);
        if (!attrMatch) {
            newLines.push(line);
            continue;
        }

        try {
            // 既存のJSONオブジェクトを取得
            const attributes = JSON.parse(attrMatch[1].replace(/''/g, "'"));
            
            // 1. schedule_json を生成（これは元の複雑な文字列からパースするのが確実）
            const schedule = parseBusinessHours(attributes.business_hours);
            const scheduleJsonStr = JSON.stringify(schedule).replace(/'/g, "''");

            // 2. attributes_json 側の business_hours を平日の代表時間のみに上書き
            attributes.business_hours = extractWeekdayHours(attributes.business_hours);
            const updatedAttrJsonStr = JSON.stringify(attributes).replace(/'/g, "''");

            // 3. カラム定義とVALUESボディをそれぞれきれいに置換
            let updatedLine = line.replace(
                ', attributes_json)',
                ', attributes_json, schedule_json)'
            ).replace(
                `'${attrMatch[1]}');`,
                `'${updatedAttrJsonStr}', '${scheduleJsonStr}');`
            );

            newLines.push(updatedLine);
            processedCount++;
        } catch (e) {
            console.error(`❌ 行のパース中にエラーが発生しました: ${line}`);
            newLines.push(line);
        }
    }

    fs.writeFileSync(outputPath, newLines.join('\n'));

    console.log(`\n✨ 完了しました。`);
    console.log(`📊 処理件数: ${processedCount} 件`);
    console.log(`保存先: ${outputPath}`);
}

main().catch(console.error);