// Usage: npx tsx scripts/brands/003-1-2_komeda_fetch_detail.ts
// Output：scripts/data/raw/003_komeda_detail.json

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { PATHS, sleep, ensureDirectory } from '../utils.js';

const CONFIG = {
    INPUT_FILE: '003_komeda.json',
    OUTPUT_FILE: '003-2_komeda_detail.json',
    BASE_DETAIL_URL: 'https://www.komeda.co.jp/shop/detail.html?id=',
    TEST_LIMIT: 1200,      // リミット件数
    BATCH_SIZE: 5,         // 同時並行数
    INCREMENTAL_MODE: true // ★ true: 差分追記モード / false: 通常モード（全件上書き）
};

interface ShopBase {
    id: number;
    brand_type: number;
    name: string;
    address: string;
    fetchedAt: string;
}

interface ShopDetail extends ShopBase {
    tel?: string;
    business_hours?: string;
    business_hours_changes?: string; // ★ 臨時休業・変更アナウンス用フィールド
    regular_holiday?: string;
    has_wifi?: string;
    has_power?: string;
    has_parking?: string;
    // 動的拡張フィールド
    smoking_status?: string;   // 禁煙／喫煙
    shop_services?: string;    // 店舗サービス
    payment_methods?: string;  // 支払方法
    available_menu?: string;   // 取扱いメニュー
}

/**
 * 1店舗の詳細情報をPlaywrightで取得
 */
async function fetchShopDetail(page: any, shop: ShopBase): Promise<ShopDetail> {
    const url = `${CONFIG.BASE_DETAIL_URL}${shop.id}`;
    console.log(`  🔍 データを取得中 [ID: ${shop.id}]: ${shop.name}`);

    try {
        // ★改善1: 不要なアセットや解析スクリプトをブロックしてハイドレーションを爆速化
        await page.route('**/*', (route: any) => {
            const url = route.request().url();
            const resourceType = route.request().resourceType();
            if (
                ['image', 'font', 'media'].includes(resourceType) || 
                url.includes('google-analytics') || 
                url.includes('googletagmanager') ||
                url.includes('analytics.js')
            ) {
                return route.abort();
            }
            return route.continue();
        });

        // ★改善2: networkidleを辞め、DOM構築（commit）の時点で即座に次へ進む
        await page.goto(url, { waitUntil: 'commit', timeout: 15000 });

        // ★改善3: 「通常営業時間に数値が出現」または「臨時休業テキストが描画」のマルチトリガー待機
        await page.waitForFunction(() => {
            // 通常の営業時間エリア
            const hoursParagraph = document.querySelector('p.shopDetail__list.multiLine__text:not([v-text*="business_hours_changes"])');
            // 臨時休業・変更エリア
            const changeParagraph = document.querySelector('p.shopDetail__list.multiLine__text[v-text*="business_hours_changes"]');

            const hoursText = hoursParagraph?.textContent?.trim() || '';
            const changeText = changeParagraph?.textContent?.trim() || '';

            // パターンA: 通常営業時間に数字（時間）が描画された
            const hasNormalHours = /\d/.test(hoursText) && !hoursText.includes('business_hours');
            
            // パターンB: 臨時休業・営業時間変更にテキストが流し込まれた
            const hasChanges = changeText !== '' && !changeText.includes('business_hours_changes');

            return hasNormalHours || hasChanges;
        }, { timeout: 8000 }).catch(() => {
            console.log(`  ⚠️ 展開監視タイムアウト。現在のDOM状態でパースを試みます。`);
        });

        // 3. DOMから詳細データを抽出（絶対に内部エラーで落とさない防護服仕様）
        const details = await page.evaluate(() => {
            const infoMap: Record<string, string> = {};
            const dts = Array.from(document.querySelectorAll('dl.shopDetail__detailList dt.shopDetail__detailListTitle'));
            
            dts.forEach(dt => {
                const key = dt.textContent?.trim();
                const dd = dt?.nextElementSibling;
                if (key && dd && !key.includes('{') && !key.includes('$')) {
                    infoMap[key] = dd.textContent?.trim() || '';
                }
            });

            const telAnchor = document.querySelector('a.shopInfoArea__textLink.--tel');
            const headings = Array.from(document.querySelectorAll('h2.shopDetail__title'));
            
            // 通常の営業時間
            const hoursH2 = headings.find(h => h.textContent?.trim() === '営業時間');
            const hoursText = hoursH2?.nextElementSibling?.textContent?.trim() || '';

            // 営業時間変更・臨時休業（存在する場合のみ回収）
            const changeH2 = headings.find(h => h.textContent?.trim() === '営業時間変更・臨時休業');
            const changeText = changeH2?.nextElementSibling?.textContent?.trim() || '';

            const holidayH2 = headings.find(h => h.textContent?.trim() === '休日');
            const holidayText = holidayH2?.nextElementSibling?.textContent?.trim() || '';

            return {
                tel: telAnchor ? telAnchor.textContent?.trim() : '',
                business_hours: hoursText,
                business_hours_changes: changeText,
                regular_holiday: holidayText,
                has_wifi: infoMap['Free Wi-Fi'] || '',
                has_power: infoMap['電源'] || '',
                has_parking: infoMap['駐車場'] || '',
                smoking_status: infoMap['禁煙／喫煙'] || '',
                shop_services: infoMap['店舗サービス'] || infoMap['店舗設備'] || '',
                payment_methods: infoMap['支払方法'] || '',
                available_menu: infoMap['取扱いメニュー'] || ''
            };
        });

        return {
            ...shop,
            ...details,
            fetchedAt: new Date().toISOString()
        };

    } catch (e) {
        console.error(`  ⚠️ ID: ${shop.id} の取得に失敗しました。元のデータを維持します。`);
        return shop;
    }
}

/**
 * メインオーケストレーター
 */
async function main() {
    const inputPath = path.join(PATHS.RAW_DATA, CONFIG.INPUT_FILE);
    const outputPath = path.join(PATHS.RAW_DATA, CONFIG.OUTPUT_FILE);

    if (!fs.existsSync(inputPath)) {
        console.error(`❌ インプットファイルが見つかりません: ${inputPath}`);
        process.exit(1);
    }

    // 1. マスターデータの読み込み
    const masterShops: ShopBase[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    
    // 2. モードに応じた処理対象（Targets）の選定と既存データの退避マップ作成
    let fetchTargets: ShopBase[] = [];
    const existingDataMap = new Map<number, ShopDetail>();

    if (CONFIG.INCREMENTAL_MODE && fs.existsSync(outputPath)) {
        console.log(`🔄 差分追記モードが有効です。既存の出力ファイルを解析中...`);
        const existingShops: ShopDetail[] = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
        
        // 既存データをIDベースでマップに格納
        existingShops.forEach(shop => existingDataMap.set(shop.id, shop));

        // 差分判定：fetchedAt（取得成否スタンプ）が記録されていない、または致命的エラーで基本項目が抜けているものを再取得
        fetchTargets = masterShops.filter(shop => {
            const existing = existingDataMap.get(shop.id);
            // 通常営業時間、または臨時休業変更アナウンスのどちらか一方でも取れていればよしとする
            const hasHoursInfo = existing && (existing.business_hours || existing.business_hours_changes);
            const isMissingDetail = !existing || !existing.fetchedAt || !existing.tel || !hasHoursInfo;
            return isMissingDetail;
        });

        console.log(`📝 既存データ: ${existingShops.length} 件 | 今回の再取得対象（未取得・エラー補正）: ${fetchTargets.length} 件`);
    } else {
        console.log(` 全件取得モード（または新規作成）で実行します。`);
        fetchTargets = [...masterShops];
    }

    // 安全のためのリミット制限
    const targetsToProcess = fetchTargets.slice(0, CONFIG.TEST_LIMIT);
    
    if (targetsToProcess.length === 0) {
        console.log(`✨ すべての詳細情報が既に取得済みです。処理を終了します。`);
        process.exit(0);
    }

    console.log(`🚀 コメダ珈琲店 詳細fetchを開始します（処理対象: ${targetsToProcess.length} 件）...`);

    // 3. ブラウザコンテキストの初期化
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });

    const newlyFetchedShops: ShopDetail[] = [];

    // 4. バッチ並行処理の実行
    for (let i = 0; i < targetsToProcess.length; i += CONFIG.BATCH_SIZE) {
        const chunk = targetsToProcess.slice(i, i + CONFIG.BATCH_SIZE);
        console.log(`📦 バッチ処理中 (${i + 1}〜${Math.min(i + CONFIG.BATCH_SIZE, targetsToProcess.length)}件目 / 残り ${targetsToProcess.length - i}件)...`);

        const results = await Promise.all(chunk.map(async (shop) => {
            const page = await context.newPage();
            const res = await fetchShopDetail(page, shop);
            await page.close();
            return res;
        }));

        newlyFetchedShops.push(...results);

        if (i + CONFIG.BATCH_SIZE < targetsToProcess.length) {
            await sleep(1500);
        }
    }

    await browser.close();

    // 5. 新旧データのディープマージと書き込み
    const finalOutput: ShopDetail[] = masterShops.map(masterShop => {
        const newDetail = newlyFetchedShops.find(s => s.id === masterShop.id);
        if (newDetail) return newDetail;

        const oldDetail = existingDataMap.get(masterShop.id);
        if (oldDetail) return oldDetail;

        return { ...masterShop };
    });

    ensureDirectory(PATHS.RAW_DATA);
    fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2));

    console.log(`\n✨ 処理が完了しました！`);
    console.log(`💾 保存先: ${outputPath} (総レコード数: ${finalOutput.length} 件)`);
}

main().catch(err => {
    console.error("❌ 致命的なエラー:", err);
    process.exit(1);
});