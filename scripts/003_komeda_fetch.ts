/**
 * Komeda Coffee Shop Data Fetcher (Hybrid Deduplication Mode)
 * 
 * Usage: npx tsx scripts/003_komeda_fetch.ts
 */

import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext, Page } from 'playwright';
import { PATHS, CONFIG, sleep, ensureDirectory } from './utils.js';
import { PREFECTURE_MASTER } from '../src/lib/constants';

const KOMEDA_CONFIG = {
    BASE_URL: 'https://eu.komeda.co.jp/v1/hp/shop',
    BRAND_TYPE: 1, // コメダ珈琲店
    OFFSET_STEP: 20,
    MAX_PAGES: 50, // 1000件（20件×50回）までのセーフティリミット
};

/**
 * [Level 1] Fetch JSON data via API
 */
async function getKomedaPageData(page: Page, prefName: string, offset: number): Promise<any> {
    const encodedPref = encodeURIComponent(prefName);
    const url = `${KOMEDA_CONFIG.BASE_URL}?prefecture=${encodedPref}&brand_type=${KOMEDA_CONFIG.BRAND_TYPE}&offset=${offset}`;
    
    try {
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        if (!response) return null;
        
        const data = await response.json();
        return data;
    } catch (e) {
        console.error(`  ⚠️ Fetch Error at offset ${offset}:`, e);
        return null;
    }
}

/**
 * [Level 2] Fetch all stores in a prefecture with paging
 */
async function fetchPrefectureFull(context: BrowserContext, prefName: string, globalSeen: Set<string>): Promise<any[]> {
    const page = await context.newPage();
    const hitsInPref: any[] = [];
    let currentOffset = 0;
    let pageCount = 0;

    while (pageCount < KOMEDA_CONFIG.MAX_PAGES) {
        const data = await getKomedaPageData(page, prefName, currentOffset);
        
        if (!data || !data.items || data.items.length === 0) {
            break; // データが空（items: []）になったら終了
        }

        let addedInThisLoop = 0;
        for (const item of data.items) {
            // IDまたは店舗名+住所でユニークキーを作成
            const uniqueKey = `komeda_${item.id}`;
            if (!globalSeen.has(uniqueKey)) {
                globalSeen.add(uniqueKey);
                hitsInPref.push({
                    ...item,
                    fetchedAt: new Date().toISOString()
                });
                addedInThisLoop++;
            }
        }

        console.log(`  📍 ${prefName} (Offset:${currentOffset}) - Found: ${data.items.length}, Total Expected: ${data.total}, New: ${addedInThisLoop}`);

        // オフセットがトータル件数を超えた、または全件取得したら終了
        if (currentOffset + KOMEDA_CONFIG.OFFSET_STEP >= data.total) {
            break;
        }

        currentOffset += KOMEDA_CONFIG.OFFSET_STEP;
        pageCount++;
        await sleep(500); // サーバー負荷軽減
    }

    await page.close();
    return hitsInPref;
}

/**
 * [Level 3] Main orchestrator
 */
async function main() {
    console.log("🚀 Starting Komeda Data Fetch (API Paging Mode)...");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });

    const globalSeen = new Set<string>();
    
    // ISOコード(01-47)のみを抽出してループ
    const prefCodes = Object.keys(PREFECTURE_MASTER).filter(key => !isNaN(Number(key)));
    const allHits: any[] = [];

    // 同時実行数は3に制限
    const BATCH_SIZE = 3; 

    for (let i = 0; i < prefCodes.length; i += BATCH_SIZE) {
        const chunk = prefCodes.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing Batch: ${chunk.join(', ')}...`);

        const results = await Promise.all(chunk.map(code => {
            const prefName = PREFECTURE_MASTER[code];
            return fetchPrefectureFull(context, prefName, globalSeen);
        }));
        
        allHits.push(...results.flat());

        if (i + BATCH_SIZE < prefCodes.length) {
            await sleep(2000); // バッチ間の待機
        }
    }

    await browser.close();
    saveResults(allHits);
}

/**
 * Saves the results to JSON
 */
function saveResults(data: any[]) {
    ensureDirectory(PATHS.RAW_DATA);
    const savePath = path.join(PATHS.RAW_DATA, '003_komeda.json');
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
    
    console.log(`\n✨ Done! Total Unique Records: ${data.length}`);
    console.log(`💾 Saved to: ${savePath}`);
}

main().catch(err => {
    console.error("❌ Fatal Error:", err);
    process.exit(1);
});