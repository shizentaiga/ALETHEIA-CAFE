/**
 * Doutor Coffee Shop Data Fetcher (Scraping Mode) - Revised
 */

import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext, Page } from 'playwright';
import { PATHS, CONFIG, sleep, ensureDirectory } from './utils.js';

// Doutor Specific Configurations
const DOUTOR_CONFIG = {
    BASE_URL: 'https://shop.doutor.co.jp/doutor/spot/list',
    SELECTOR: '.copper-list-items',
    LIMIT: 50,      // Default limit for safety
    MAX_PAGES: 20   // Safety: Max 1,000 stores per prefecture
};

/**
 * [Level 1] Low-level Browser Operation
 */
async function getDoutorPageData(page: Page, prefCode: string, offset = 0): Promise<any[]> {
    const url = `${DOUTOR_CONFIG.BASE_URL}?limit=${DOUTOR_CONFIG.LIMIT}&address=${prefCode}&offset=${offset}`;
    
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        
        // Wait for the store list widget
        // 5秒待機。店舗がない県ではここでタイムアウトします。
        await page.waitForSelector(DOUTOR_CONFIG.SELECTOR, { timeout: 5000 });
        
        const spotRows = await page.locator(DOUTOR_CONFIG.SELECTOR).all();
        const extractedData = [];

        for (const row of spotRows) {
            const rawText = await row.innerText();
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
            extractedData.push({
                rawLines: lines,
                fetchedAt: new Date().toISOString()
            });
        }
        
        return extractedData;
    } catch (e: any) {
        // 店舗が存在しない県、またはネットワークエラーのハンドリング
        if (e.name === 'TimeoutError' || e.message.includes('timeout')) {
            console.log(`  ℹ️  インターネットエラー もしくは 店舗が存在しない可能性があります：Pref:${prefCode} (area=${prefCode})`);
        } else {
            console.error(`  ⚠️  Unexpected Error on Pref:${prefCode}: ${e.message}`);
        }
        return [];
    }
}

/**
 * [Level 2] Pagination logic
 */
async function fetchPrefectureFull(context: BrowserContext, prefCode: string): Promise<any[]> {
    const page = await context.newPage();
    const hitsInPref: any[] = [];
    let offset = 0;
    let hasMore = true;
    let pageCount = 0;
    let lastFetchedCount = -1;

    while (hasMore && pageCount < DOUTOR_CONFIG.MAX_PAGES) {
        const data = await getDoutorPageData(page, prefCode, offset);
        
        // データが取れなかった（またはタイムアウトした）場合は終了
        if (data.length === 0) break;

        // 同じオフセットで同じ件数が連続して取れた場合、
        // サイト側の挙動による無限ループを避けるため終了判定
        if (data.length === lastFetchedCount && data.length > 0) {
            // ※完全に同一データかまではチェックしていませんが、簡易的な重複回避として機能します
            break;
        }

        hitsInPref.push(...data);
        console.log(`  📍 Pref:${prefCode} - Fetched: ${data.length} (Total so far: ${hitsInPref.length})`);

        if (data.length < DOUTOR_CONFIG.LIMIT) {
            hasMore = false;
        } else {
            offset += DOUTOR_CONFIG.LIMIT;
            pageCount++;
            lastFetchedCount = data.length;
            await sleep(CONFIG.WAIT_SHORT);
        }
    }

    await page.close();
    return hitsInPref;
}

/**
 * [Level 3] Main orchestrator
 */
async function main() {
    console.log("🚀 Starting Doutor Data Fetch (Optimized Playwright Mode)...");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });

    const prefList = Array.from({ length: 47 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const allHits: any[] = [];

    const BATCH_SIZE = Math.min(CONFIG.CONCURRENCY, 3); 

    for (let i = 0; i < prefList.length; i += BATCH_SIZE) {
        const chunk = prefList.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing Batch: ${chunk.join(', ')}...`);

        const results = await Promise.all(chunk.map(pref => fetchPrefectureFull(context, pref)));
        allHits.push(...results.flat());

        if (i + BATCH_SIZE < prefList.length) {
            await sleep(CONFIG.WAIT_LONG);
        }
    }

    await browser.close();
    saveResults(allHits);
}

function saveResults(data: any[]) {
    ensureDirectory(PATHS.RAW_DATA);
    const savePath = path.join(PATHS.RAW_DATA, '002_doutor.json');
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
    
    console.log(`\n✨ Done! Total Records: ${data.length}`);
    console.log(`💾 Saved to: ${savePath}`);
}

main().catch(err => {
    console.error("❌ Fatal Error:");
    console.error(err);
    process.exit(1);
});