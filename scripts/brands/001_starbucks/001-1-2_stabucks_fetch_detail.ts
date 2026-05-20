// Usage: npx tsx scripts/brands/001_starbucks/001-1-2_stabucks_fetch_detail.ts

/**
 * ①JSONファイルから店舗のURLを読み込み
 * ②店舗URLにアクセス
 * ③余計な変換をせず、生のファクトデータ（Rowデータ）のみを取得して保存
 */

import fs from 'fs-extra';
import path from 'path';
import { chromium, Page } from 'playwright';

// =============================================================================
// 1. 設定 & 型定義
// =============================================================================
const CONFIG = {
    INPUT_FILE: path.join(process.cwd(), 'scripts/data/raw/001_starbucks.json'),
    OUTPUT_FILE: path.join(process.cwd(), 'scripts/data/raw/001-2_starbucks_detail.json'),
    BASE_DETAIL_URL: 'https://store.starbucks.co.jp/detail-',
    TEST_LIMIT: null,              // リミット件数（全件処理時は null または Infinity）
    BATCH_SIZE: 5,               // 同時並行数
    INCREMENTAL_MODE: false      // true: 差分追記モード / false: 通常モード
};

// 取得する生データのクリーンな構造定義
interface StarbucksRowData {
    store_id: string;
    detail_url: string;
    // 元ファイル(001_starbucks.json)に入っていた生のfields項目をそのまま保持（退避用）
    raw_input_fields: any; 
    // サイトの script[type="application/ld+json"] から取得した生テキスト
    // パースエラー等でデータが欠損するのを防ぐため、文字列のまま未加工で保存する
    raw_json_ld: string | null; 
    fetched_at: string;
}

// =============================================================================
// 2. コア処理関数
// =============================================================================

/**
 * 1つの店舗にアクセスし、生のWebファクト（JSON-LD）を抽出する
 */
async function fetchStoreRawData(page: Page, storeRaw: any): Promise<StarbucksRowData | null> {
    const fields = storeRaw.fields;
    const storeId = fields?.store_id;
    if (!storeId) return null;

    const detailUrl = `${CONFIG.BASE_DETAIL_URL}${storeId}/`;
    
    try {
        // 詳細ページへ遷移
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // 【修正箇所】ページ内のすべてのJSON-LDから「Restaurant」が含まれるものを抽出
        const rawJsonLd = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            
            // "@type": "Restaurant" または店舗データ特有のキーワードが含まれるスクリプトを探す
            const restaurantScript = scripts.find(script => {
                const content = script.textContent || '';
                return content.includes('"Restaurant"') || content.includes('"openingHoursSpecification"');
            });

            // 見つかればそれを返し、万が一見つからなければ最初のものをフォールバックとして返す
            return restaurantScript ? restaurantScript.textContent : (scripts[0] ? scripts[0].textContent : null);
        });

        return {
            store_id: storeId.toString(),
            detail_url: detailUrl,
            raw_input_fields: fields,
            raw_json_ld: rawJsonLd,
            fetched_at: new Date().toISOString()
        };

    } catch (error) {
        console.error(`[Error] Failed to fetch store_id ${storeId}:`, error);
        return null;
    }
}

// =============================================================================
// 3. メイン実行フロー
// =============================================================================
async function main() {
    console.log('🚀 Starting Starbucks Pure Raw Data Fetcher...');

    // 既存データの読み込み
    if (!await fs.pathExists(CONFIG.INPUT_FILE)) {
        console.error(`Input file not found at: ${CONFIG.INPUT_FILE}`);
        process.exit(1);
    }
    const rawData = await fs.readJson(CONFIG.INPUT_FILE);
    
    // リミット制限の適用
    let storesToProcess = Array.isArray(rawData) ? rawData : [];
    if (CONFIG.TEST_LIMIT && CONFIG.TEST_LIMIT < storesToProcess.length) {
        storesToProcess = storesToProcess.slice(0, CONFIG.TEST_LIMIT);
    }

    // 差分追記モード of 処理
    let existingResults: StarbucksRowData[] = [];
    if (CONFIG.INCREMENTAL_MODE && await fs.pathExists(CONFIG.OUTPUT_FILE)) {
        existingResults = await fs.readJson(CONFIG.OUTPUT_FILE);
        const processedIds = new Set(existingResults.map(r => r.store_id));
        storesToProcess = storesToProcess.filter(s => !processedIds.has(s.fields?.store_id?.toString()));
    }

    console.log(`📋 Total targets to crawl: ${storesToProcess.length}`);
    if (storesToProcess.length === 0) {
        console.log('✅ No new stores to fetch.');
        return;
    }

    // ブラウザの起動
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    
    const results: StarbucksRowData[] = [...existingResults];

    // バッチ（チャンク）単位での並行処理
    for (let i = 0; i < storesToProcess.length; i += CONFIG.BATCH_SIZE) {
        const chunk = storesToProcess.slice(i, i + CONFIG.BATCH_SIZE);
        console.log(`⏳ Fetching batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1} (${i + 1} ~ ${Math.min(i + CONFIG.BATCH_SIZE, storesToProcess.length)})`);

        const promises = chunk.map(async (storeRaw) => {
            const page = await context.newPage();
            // メディアやCSSなど不要なリソースを排除して高速化
            await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,pdf}', route => route.abort());
            
            const res = await fetchStoreRawData(page, storeRaw);
            await page.close();
            return res;
        });

        const batchResults = await Promise.all(promises);
        for (const res of batchResults) {
            if (res) results.push(res);
        }

        // バッチごとに生データを随時安全保存
        await fs.ensureDir(path.dirname(CONFIG.OUTPUT_FILE));
        await fs.writeJson(CONFIG.OUTPUT_FILE, results, { spaces: 2 });
    }

    await browser.close();
    console.log(`🎉 Fetch process finished. Pure row data saved to: ${CONFIG.OUTPUT_FILE}`);
}

main().catch(console.error);