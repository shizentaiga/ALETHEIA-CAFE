/**
 * Doutor Coffee Shop Data Fetcher (Hybrid Deduplication Mode)
 */

import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext, Page } from 'playwright';
import { PATHS, CONFIG, sleep, ensureDirectory } from './utils.js';

const DOUTOR_CONFIG = {
    BASE_URL: 'https://shop.doutor.co.jp/doutor/spot/list',
    SELECTOR: '.copper-list-items',
    LIMIT: 50,
    MAX_PAGES: 20 
};

/**
 * [Level 1] Low-level Browser Operation
 */
async function getDoutorPageData(page: Page, prefCode: string, offset = 0): Promise<any[]> {
    const url = `${DOUTOR_CONFIG.BASE_URL}?limit=${DOUTOR_CONFIG.LIMIT}&address=${prefCode}&offset=${offset}`;
    
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(1000); 
        await page.waitForSelector(DOUTOR_CONFIG.SELECTOR, { timeout: 8000 });
        
        const spotRows = await page.locator(DOUTOR_CONFIG.SELECTOR).all();
        const extractedData = [];

        for (const row of spotRows) {
            const rawText = await row.innerText();
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
            if (lines.length >= 2) {
                extractedData.push({
                    rawLines: lines,
                    fetchedAt: new Date().toISOString()
                });
            }
        }
        return extractedData;
    } catch (e: any) {
        return [];
    }
}

/**
 * [Level 2] Pagination logic with Deduplication
 */
async function fetchPrefectureFull(context: BrowserContext, prefCode: string, globalSeen: Set<string>): Promise<any[]> {
    const page = await context.newPage();
    const hitsInPref: any[] = [];
    let offset = 0;
    let pageCount = 0;

    while (pageCount < DOUTOR_CONFIG.MAX_PAGES) {
        const data = await getDoutorPageData(page, prefCode, offset);
        if (data.length === 0) break;

        let newRecordsFound = 0;
        for (const item of data) {
            // 店舗名(index 0)と住所(index 1)を組み合わせて一意のキーを作成
            const storeName = item.rawLines[0];
            const address = item.rawLines[1];
            const uniqueKey = `${storeName}_${address}`;

            if (!globalSeen.has(uniqueKey)) {
                globalSeen.add(uniqueKey);
                hitsInPref.push(item);
                newRecordsFound++;
            }
        }

        console.log(`  📍 Pref:${prefCode} - New unique stores: ${newRecordsFound} (Total in Pref: ${hitsInPref.length})`);

        // 今回の取得に「新しいデータ」が1件も含まれていなかった場合、
        // すでに全件取得済みのページをループしている可能性が高いため終了
        if (newRecordsFound === 0 && data.length > 0) {
            break;
        }

        if (data.length < DOUTOR_CONFIG.LIMIT) break;

        offset += DOUTOR_CONFIG.LIMIT;
        pageCount++;
        await sleep(1000);
    }

    await page.close();
    return hitsInPref;
}

/**
 * [Level 3] Main orchestrator
 */
async function main() {
    console.log("🚀 Starting Doutor Data Fetch (Deduplication Mode)...");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });

    // 全体で重複を管理するためのSet
    const globalSeen = new Set<string>();
    const prefList = Array.from({ length: 47 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const allHits: any[] = [];

    const BATCH_SIZE = 3; 

    for (let i = 0; i < prefList.length; i += BATCH_SIZE) {
        const chunk = prefList.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing Batch: ${chunk.join(', ')}...`);

        // globalSeenを渡して重複排除を行う
        const results = await Promise.all(chunk.map(pref => fetchPrefectureFull(context, pref, globalSeen)));
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
    
    console.log(`\n✨ Done! Total Unique Records: ${data.length}`);
    console.log(`💾 Saved to: ${savePath}`);
}

main().catch(err => {
    console.error("❌ Fatal Error:", err);
    process.exit(1);
});