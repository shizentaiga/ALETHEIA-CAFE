/**
 * Doutor Coffee Shop Data Fetcher (Hybrid Deduplication Mode)
 * 
 * Usage: npx tsx scripts/002_doutor_fetch.ts
 */

import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext, Page } from 'playwright';
import { PATHS, CONFIG, sleep, ensureDirectory } from './utils.js';

const DOUTOR_CONFIG = {
    BASE_URL: 'https://shop.doutor.co.jp/doutor/spot/list',
    SELECTOR: '.copper-list-items',
    LIMIT: 50,
    MAX_PAGES: 20 // Safety limit: Max 1,000 records per prefecture
};

/**
 * [Level 1] Fetch page data by increasing the "limit" parameter.
 * Doutor's API returns all records up to the specified limit from the start.
 */
async function getDoutorPageData(page: Page, prefCode: string, currentTotalExpected: number): Promise<any[]> {
    // Request all records from offset 0 up to current limit to handle dynamic rendering
    const url = `${DOUTOR_CONFIG.BASE_URL}?limit=${currentTotalExpected}&address=${prefCode}&offset=0`;
    
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(1500); // Allow time for client-side rendering
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
 * [Level 2] Fetch all stores in a prefecture with deduplication.
 */
async function fetchPrefectureFull(context: BrowserContext, prefCode: string, globalSeen: Set<string>): Promise<any[]> {
    const page = await context.newPage();
    const hitsInPref: any[] = [];
    let currentLimit = 50; 
    let pageCount = 0;
    let lastTotalCount = -1;

    while (pageCount < DOUTOR_CONFIG.MAX_PAGES) {
        const data = await getDoutorPageData(page, prefCode, currentLimit);
        
        if (data.length === 0) break;

        // Stop if no new data is loaded (DOM count remains unchanged)
        if (data.length === lastTotalCount) break;

        let addedInThisLoop = 0;
        for (const item of data) {
            // Create a unique key using "Name + Address" to prevent duplicates
            const uniqueKey = `${item.rawLines[0]}_${item.rawLines[1]}`;
            if (!globalSeen.has(uniqueKey)) {
                globalSeen.add(uniqueKey);
                hitsInPref.push(item);
                addedInThisLoop++;
            }
        }

        console.log(`  📍 Pref:${prefCode} (Limit:${currentLimit}) - DOM Total: ${data.length}, New Unique: ${addedInThisLoop}`);

        // If returned data is less than requested limit, we have reached the end
        if (data.length < currentLimit) {
            break;
        }

        lastTotalCount = data.length;
        currentLimit += 50; // Increase limit for the next iteration
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
    console.log("🚀 Starting Doutor Data Fetch (Persistent Deduplication Mode)...");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });

    const globalSeen = new Set<string>();
    const prefList = Array.from({ length: 47 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const allHits: any[] = [];

    // Limit concurrency to 3 to prevent memory exhaustion
    const BATCH_SIZE = 3; 

    for (let i = 0; i < prefList.length; i += BATCH_SIZE) {
        const chunk = prefList.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing Batch: ${chunk.join(', ')}...`);

        const results = await Promise.all(chunk.map(pref => fetchPrefectureFull(context, pref, globalSeen)));
        allHits.push(...results.flat());

        if (i + BATCH_SIZE < prefList.length) {
            await sleep(CONFIG.WAIT_LONG);
        }
    }

    await browser.close();
    saveResults(allHits);
}

/**
 * Saves the final deduplicated dataset to a JSON file.
 */
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