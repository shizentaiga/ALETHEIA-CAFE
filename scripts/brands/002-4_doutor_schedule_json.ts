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
        // 現在のslotの文字列表現を作成してキーにする (例: '[{"start":"09:00","end":"19:00"}]')
        const currentSlotStr = JSON.stringify(current.slots);
        
        // すでにマージ先リストに同じ時間帯のものがあるか探す
        const existing = mergedSlots.find(item => JSON.stringify(item.slots) === currentSlotStr);

        if (existing) {
            // 同じ時間帯があれば、曜日配列（days）を結合する
            existing.days = [...existing.days, ...current.days];
        } else {
            // 新しい時間帯パターンならディープコピーして追加
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

    // 全角を半角に、スペースを除去
    const normalized = rawStr.replace(/：/g, ':').replace(/～/g, '-').replace(/\s/g, '');

    // スラッシュで分割して、セグメントごとにパース
    const segments = normalized.split('/');
    const baseSlots: any[] = [];

    for (const segment of segments) {
        // 「備考」や「ラストオーダー」が含まれるセグメントは完全に無視
        if (segment.includes('備考') || segment.includes('ラスト')) {
            continue;
        }

        // 営業日タイプと時間のキャプチャ (例: 平日営業時間09:00-19:00)
        const match = segment.match(/(平日|土曜|日祝)営業時間(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
        if (match) {
            const type = match[1];
            const start = match[2].padStart(5, '0'); // 9:00 -> 09:00
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

    // 有効なスロットが1つでも生成できれば構造を返す
    if (baseSlots.length > 0) {
        // 重複する時間帯の曜日を1つにマージ
        const optimizedSlots = optimizeSchedule(baseSlots);

        return {
            base: optimizedSlots,
            exclude_holidays: false // カフェチェーンのため、祝日も基本日祝スロットを適用
        };
    }

    // パースに失敗した（または該当スロットがない）場合は例外ログ
    console.warn(`  ⚠️ パース失敗: "${rawStr}" は標準形式ではないため空で出力します。`);
    return defaultSchedule;
}

async function main() {
    console.log("🚀 ドトール schedule_json の生成を開始します...");

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

        // attributes_json の中身を抽出
        const attrMatch = line.match(/'({.*})'\);/);
        if (!attrMatch) {
            newLines.push(line);
            continue;
        }

        try {
            const attributes = JSON.parse(attrMatch[1].replace(/''/g, "'"));
            const schedule = parseBusinessHours(attributes.business_hours);
            const scheduleJsonStr = JSON.stringify(schedule).replace(/'/g, "''");

            // INSERT文の末尾 ); を置換して schedule_json カラムを追加
            let updatedLine = line.replace(
                ', attributes_json)',
                ', attributes_json, schedule_json)'
            ).replace(
                `'${attrMatch[1]}');`,
                `'${attrMatch[1]}', '${scheduleJsonStr}');`
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