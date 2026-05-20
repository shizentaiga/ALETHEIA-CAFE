/**
 * Doutor SQL Repair Script (Google Maps Edition)
 * * 002-1_doutor.sql を読み込み、座標を補完・抽出して 
 * 「主キー、緯度、経度」のみを更新する SQL (002-2_doutor.sql) を生成します。
 * * Usage: npx tsx scripts/brands/002-3_doutor_repair_coords.ts
 * * 【主キー生成戦略: service_id の不変性確保】
 * 1. 優先：電話番号（ハイフン除去）
 * 2. 次点：店名 ＋ 住所 のハッシュ値
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

/**
 * 基本設定
 */
const CONFIG = {
    MAX_REPAIRS: 3000,
    INPUT_FILE: 'src/db/seed/brands/002-1_doutor.sql',
    OUTPUT_FILE: 'src/db/seed/brands/002-2_doutor.sql',
    SLEEP_MS: 100, // Google Maps APIのスロットリング用
};

// .dev.vars の読み込み
const envPath = path.resolve(process.cwd(), '.dev.vars');
const env = dotenv.parse(fs.readFileSync(envPath));
const API_KEY = env.GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
    console.error('❌ Error: GOOGLE_MAPS_API_KEY が .dev.vars に定義されていません。');
    process.exit(1);
}

/**
 * Google Maps Geocoding API 呼び出し
 */
async function fetchCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}&language=ja`;
    
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        
        const data: any = await res.json();
        
        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return { 
                lat: location.lat, 
                lng: location.lng 
            };
        }
        return null;
    } catch (e) {
        console.error(`    ⚠️ API接続エラー: ${e}`);
        return null;
    }
}

/**
 * 住所の正規化
 */
function normalizeAddress(address: string): string {
    return address.trim().replace(/\s+/g, ' ');
}

async function main() {
    if (!fs.existsSync(CONFIG.INPUT_FILE)) {
        console.error(`❌ 入力ファイルが見つかりません: ${CONFIG.INPUT_FILE}`);
        return;
    }

    const sqlContent = fs.readFileSync(CONFIG.INPUT_FILE, 'utf-8');
    const lines = sqlContent.split('\n').filter(line => line.trim().startsWith('INSERT'));
    
    // --- 1. 統計情報の算出 ---
    let totalCount = lines.length;
    let existingCoordsCount = 0;
    let nullCoordsCount = 0;

    for (const line of lines) {
        if (line.includes('NULL, NULL')) {
            nullCoordsCount++;
        } else {
            existingCoordsCount++;
        }
    }

    console.log(`📊 --- 統計情報 ---`);
    console.log(`総レコード数: ${totalCount}`);
    console.log(`座標あり: ${existingCoordsCount}`);
    console.log(`座標なし (NULL): ${nullCoordsCount}`);
    console.log(`最大補完制限 (MAX_REPAIRS): ${CONFIG.MAX_REPAIRS}`);
    console.log(`------------------\n`);

    const updateStatements: string[] = [];
    let repairSuccess = 0;
    let repairFail = 0;
    let skipCount = 0;

    console.log(`🚀 処理を開始します...`);

    for (let line of lines) {
        // service_id, title, address を抽出
        // 0: service_id, 1: brand_id, 2: owner_id, 3: plan_id, 4: area_id, 5: title, 6: address, 7: lat, 8: lng
        const match = line.match(/VALUES \('([^']+)', '[^']+', '[^']+', '[^']+', (?:'[^']+'|NULL), '([^']+)', '([^']+)',/);

        if (!match) continue;

        const serviceId = match[1];
        const title = match[2];
        const rawAddress = match[3];
        
        // 既存の緯度経度をチェック
        const isNull = line.includes('NULL, NULL');

        if (!isNull) {
            // すでに座標がある場合は、その値を抽出して UPDATE 文を作成
            const coordsMatch = line.match(/, ([\d.-]+), ([\d.-]+), '\{/);
            if (coordsMatch) {
                updateStatements.push(`UPDATE services SET lat = ${coordsMatch[1]}, lng = ${coordsMatch[2]} WHERE service_id = '${serviceId}'; -- ${title}`);
            }
        } else {
            // 座標が NULL の場合
            if (repairSuccess < CONFIG.MAX_REPAIRS) {
                const targetAddress = normalizeAddress(rawAddress);
                const coords = await fetchCoordinates(targetAddress);

                if (coords) {
                    updateStatements.push(`UPDATE services SET lat = ${coords.lat}, lng = ${coords.lng} WHERE service_id = '${serviceId}'; -- ${title}`);
                    repairSuccess++;
                    process.stdout.write('.'); // 進捗をドットで表示
                } else {
                    repairFail++;
                    console.log(`\n❌ [取得失敗] ID: ${serviceId} | Name: ${title}`);
                }
                
                // API負荷軽減
                await new Promise(resolve => setTimeout(resolve, CONFIG.SLEEP_MS));
            } else {
                skipCount++;
            }
        }
    }

    // --- ファイル出力 ---
    const header = `-- Doutor Coordinates Patch -- Generated: ${new Date().toLocaleString()}\n\n`;
    fs.writeFileSync(CONFIG.OUTPUT_FILE, header + updateStatements.join('\n'));

    console.log(`\n\n✨ 処理が完了しました。`);
    console.log(`✅ 既存座標の維持・抽出: ${existingCoordsCount} 件`);
    console.log(`補完成功 (Google API): ${repairSuccess} 件`);
    if (repairFail > 0) console.log(`❌ 補完失敗: ${repairFail} 件`);
    if (skipCount > 0) console.log(`⚠️ 制限超過によるスキップ: ${skipCount} 件`);
    console.log(`💾 保存先: ${CONFIG.OUTPUT_FILE}`);
}

main().catch(console.error);