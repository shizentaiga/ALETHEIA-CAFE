// Usage: npx tsx scripts/brands/003-3-2_komeda_merge.ts

// 設計メモ
// INPUT_FILE1(緯度経度なし)
// INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json) VALUES ('KMD_457', 'brand_komeda', '01ARZ3NDEKTSV4RRFFQ69G5FAV', 'free', '10-10-A004', 'コメダ珈琲店 カインズ伊勢崎店', '群馬県伊勢崎市宮子町３１５４番', 36.3344635, 139.1590787, '{"category":"cat_cafe","ext_source":"komeda_official","ext_place_id":"KMD_OFFICIAL_457","brand_type":1}');
// INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json) VALUES ('KMD_498', 'brand_komeda', '01ARZ3NDEKTSV4RRFFQ69G5FAV', 'free', '10-10-A002', 'コメダ珈琲店 イオンモール高崎店', '群馬県高崎市棟高町１４００イオンモール高崎１Ｆ', 36.3906591, 139.0068085, '{"category":"cat_cafe","ext_source":"komeda_official","ext_place_id":"KMD_OFFICIAL_498","brand_type":1}');
// INSERT OR REPLACE INTO services (service_id, brand_id, owner_id, plan_id, area_id, title, address, lat, lng, attributes_json) VALUES ('KMD_530', 'brand_komeda', '01ARZ3NDEKTSV4RRFFQ69G5FAV', 'free', '10-10-A005', 'コメダ珈琲店 イオンモール太田店', '群馬県太田市石原町８１イオンモール太田１Ｆ', 36.29411, 139.4005458, '{"category":"cat_cafe","ext_source":"komeda_official","ext_place_id":"KMD_OFFICIAL_530","brand_type":1}');

// INPUT_FILE2(緯度経度のみ)
// UPDATE services SET lat = 36.3344635, lng = 139.1590787 WHERE service_id = 'KMD_457'; -- コメダ珈琲店 カインズ伊勢崎店
// UPDATE services SET lat = 36.3906591, lng = 139.0068085 WHERE service_id = 'KMD_498'; -- コメダ珈琲店 イオンモール高崎店
// UPDATE services SET lat = 36.29411, lng = 139.4005458 WHERE service_id = 'KMD_530'; -- コメダ珈琲店 イオンモール太田店

//  OUTPUT_FILE
// 上記の1と2をマージして、緯度経度ありの全文のSQLにしたい。

// Usage: npx tsx scripts/brands/003-3-2_komeda_merge.ts

import fs from 'fs';
import path from 'path';

/**
 * 基本設定
 */
const CONFIG = {
    INPUT_FILE1: 'src/db/seed/brands/003-1_komeda.sql', // 緯度経度なし（またはダミー値）のINSERT文
    INPUT_FILE2: 'src/db/seed/brands/003-2_komeda_geo_cache.sql', // 緯度経度のみのUPDATE文
    OUTPUT_FILE: 'src/db/seed/brands/003-3_komeda.sql', // マージ済みの完全なINSERT文
};

interface GeoData {
    lat: string;
    lng: string;
}

async function main() {
    // 1. ファイルパスの解決
    const projectRoot = process.cwd();
    const inputPath1 = path.join(projectRoot, CONFIG.INPUT_FILE1);
    const inputPath2 = path.join(projectRoot, CONFIG.INPUT_FILE2);
    const outputPath = path.join(projectRoot, CONFIG.OUTPUT_FILE);

    // バリデーション
    if (!fs.existsSync(inputPath1) || !fs.existsSync(inputPath2)) {
        console.error(`❌ インプットファイルが見つかりません。パスを確認してください。\n1: ${inputPath1}\n2: ${inputPath2}`);
        process.exit(1);
    }

    console.log(`⏳ 緯度経度データのマージ処理を開始します...`);

    // 2. INPUT_FILE2 (UPDATE文) から緯度経度マッピングを作成
    const geoMap = new Map<string, GeoData>();
    const file2Content = fs.readFileSync(inputPath2, 'utf-8');
    const updateLines = file2Content.split('\n');

    // UPDATE services SET lat = 36.3344635, lng = 139.1590787 WHERE service_id = 'KMD_457';
    // 上記から service_id, lat, lng を抽出する正規表現
    const updateRegex = /SET\s+lat\s*=\s*([\d.-]+),\s*lng\s*=\s*([\d.-]+)\s+WHERE\s+service_id\s*=\s*'([^']+)'/i;

    for (const line of updateLines) {
        if (!line.trim() || line.startsWith('--')) continue;

        const match = line.match(updateRegex);
        if (match) {
            const [_, lat, lng, serviceId] = match;
            geoMap.set(serviceId, { lat, lng });
        }
    }

    console.log(`📦 UPDATE文から ${geoMap.size} 件の緯度経度データを抽出しました。`);

    // 3. INPUT_FILE1 (INSERT文) の緯度経度をマッピングデータで置換
    const file1Content = fs.readFileSync(inputPath1, 'utf-8');
    const insertLines = file1Content.split('\n');
    const mergedLines: string[] = [];
    let mergeCount = 0;

    // VALUES ('service_id', ... , 'address', lat, lng, 'attributes_json')
    // service_id と、その後ろに続く引数をキャプチャし、引数最後の lat, lng 部分を特定する正規表現
    const insertRegex = /VALUES\s*\(\s*'([^']+)'\s*,\s*(.+)\s*\);/i;

    for (const line of insertLines) {
        // 空行やコメント行はそのまま維持
        if (!line.trim() || line.trim().startsWith('--')) {
            mergedLines.push(line);
            continue;
        }

        const match = line.match(insertRegex);
        if (match) {
            const [_, serviceId, valuesBody] = match;
            const geo = geoMap.get(serviceId);

            if (geo) {
                // VALUESのカンマ区切り要素を分解して、lat/lngに該当するインデックスを正確に上書き
                // ※文字列内のカンマに反応しないよう注意が必要ですが、通常SQLシードなら末尾から3番目・2番目がlat, lng
                const tokens = valuesBody.split(/,(?=(?:[^']*'[^']*')*[^']*$)/); 
                
                // 厳密なカラム位置（後ろから3番目がlat、2番目がlng、最後がattributes_json）
                if (tokens.length >= 3) {
                    tokens[tokens.length - 3] = ` ${geo.lat}`;
                    tokens[tokens.length - 2] = ` ${geo.lng}`;
                }

                // 修正したVALUESボディでLINEを再構築
                const updatedLine = line.replace(valuesBody, tokens.join(','));
                mergedLines.push(updatedLine);
                mergeCount++;
            } else {
                // 緯度経度データが見つからなかった場合はそのまま残す
                console.log(`⚠️ 警告: service_id '${serviceId}' の緯度経度がUPDATE文に見つかりません。`);
                mergedLines.push(line);
            }
        } else {
            // INSERT文の構文にマッチしない行もそのまま流す
            mergedLines.push(line);
        }
    }

    // 4. 出力ファイルへの書き込み
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, mergedLines.join('\n'), 'utf-8');

    // 5. 結果のコンソール表示（相対パス表記）
    const relativeOutputPath = path.relative(projectRoot, outputPath);
    console.log(`\n✨ マージが完了しました！`);
    console.log(`💾 保存先: ${relativeOutputPath} (マージ成功: ${mergeCount} / ${geoMap.size} 件)`);
}

main().catch(err => {
    console.error("❌ 致命的なエラー:", err);
    process.exit(1);
});