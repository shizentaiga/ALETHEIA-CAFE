// Usage: npx tsx scripts/brands/001-4_starbucks_schedule_json.ts

/**
 * 設計メモ
 * * ・スキーマ
 * CREATE TABLE services (
 * service_id      TEXT PRIMARY KEY,
 * -- Availability Schedule (iCalendar-based JSON)
 * -- -------------------------------------------------------------------------
 * -- 構造例: {"base": [{"days": ["MO"], "slots": [{"start": "07:00", "end": "12:00"}]}], "exclude_holidays": true}
 * -- -------------------------------------------------------------------------
 * schedule_json   TEXT DEFAULT '{}',
 * * ・インプット：src/db/seed/brands/001-1_starbucks.sql
 * "business_hours":"07:00～22:00"
 * INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json) VALUES ('STB_333', 'brand_starbucks', '01ARZ3NDEKTSV4RRFFQ69G5FAV', 'free', '01-V10-A001', 'スターバックス コーヒー 札幌グランドホテル店', '北海道 札幌市中央区 北1条西4丁目 札幌グランドホテル 1F', 43.0630144394, 141.351145716, '{"category":"cat_cafe","wifi":true,"ext_source":"starbucks_official","ext_place_id":"STB_OFFICIAL_333","business_hours":"07:00～22:00"}');
 * * ・アウトプット：src/db/seed/brands/001-4_starbucks.sql
 * ※001-4の数字の4は、スクリプトの番号と合わせたため。(1はfetch、2はconvertなので、本来は2番と4番のみがあれば良いが、そこまで配慮できなかったため、今後はそのように運用しようかと。)
 * {"base": [{"days": ["MO", "TU", "WE", "TH", "FR", "SA", "SU"], "slots": [{"start": "07:00", "end": "22:00"}]}], "exclude_holidays": false}
 * の正式な書き方に変換。
 */

import fs from 'fs';
import path from 'path';

const PATH_CONFIG = {
    INPUT_SQL: 'src/db/seed/brands/001-1_starbucks.sql',
    OUTPUT_SQL: 'src/db/seed/brands/001-4_starbucks.sql'
};

/**
 * 営業時間の文字列を schedule_json 構造に変換
 */
function parseBusinessHours(rawStr: string | null): any {
    const defaultSchedule = { base: [] };
    if (!rawStr) return defaultSchedule;

    // 全角を半角に、スペースを除去
    const normalized = rawStr.replace(/：/g, ':').replace(/～/g, '-').replace(/\s/g, '');

    // 基本的な "HH:mm-HH:mm" 形式をキャプチャ
    const match = normalized.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);

    if (match) {
        const start = match[1].padStart(5, '0'); // 7:00 -> 07:00
        const end = match[2].padStart(5, '0');

        return {
            base: [
                {
                    // スタバの基本営業は全曜日一律として処理
                    days: ["MO", "TU", "WE", "TH", "FR", "SA", "SU"],
                    slots: [{ start, end }]
                }
            ],
            exclude_holidays: false // スタバは祝日も営業することが多いため
        };
    }

    // パースに失敗した場合は例外ログ
    console.warn(`  ⚠️ パース失敗: "${rawStr}" は標準形式ではないため空で出力します。`);
    return defaultSchedule;
}

async function main() {
    console.log("🚀 schedule_json の生成を開始します...");

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

        // attributes_json の中身を抽出 (簡易的な抽出ロジック)
        const attrMatch = line.match(/'({.*})'\);/);
        if (!attrMatch) {
            newLines.push(line);
            continue;
        }

        const attributes = JSON.parse(attrMatch[1].replace(/''/g, "'"));
        const schedule = parseBusinessHours(attributes.business_hours);
        const scheduleJsonStr = JSON.stringify(schedule).replace(/'/g, "''");

        // INSERT文の末尾 ); を置換して schedule_json カラムを追加
        // 元のINSERT文のカラム指定部分に schedule_json を追加し、VALUESの末尾に値を挿入
        let updatedLine = line.replace(
            ', attributes_json)',
            ', attributes_json, schedule_json)'
        ).replace(
            `'${attrMatch[1]}');`,
            `'${attrMatch[1]}', '${scheduleJsonStr}');`
        );

        newLines.push(updatedLine);
        processedCount++;
    }

    fs.writeFileSync(outputPath, newLines.join('\n'));

    console.log(`\n✨ 完了しました。`);
    console.log(`📊 処理件数: ${processedCount} 件`);
    console.log(`保存先: ${outputPath}`);
}

main().catch(console.error);