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
async function getDoutorPrefectureData(page: Page, prefCode: string): Promise<any[]> {
    const url = `${DOUTOR_CONFIG.BASE_URL}?address=${prefCode}`;
    // 「もっと見る」ボタンのセレクタ（テキスト指定の方が安定する場合があります）
    const LOAD_MORE_SELECTOR = '.copper-list-more-button'; 
    
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        
        let safetyCounter = 0;

        // --- 1. 「もっと見る」を押し切るフェーズ ---
        while (safetyCounter < DOUTOR_CONFIG.MAX_PAGES) {
            const loadMoreButton = page.locator(LOAD_MORE_SELECTOR);
            
            // ボタンが存在し、かつ表示されているかチェック
            const isBtnVisible = await loadMoreButton.isVisible();
            
            if (isBtnVisible) {
                // ボタンまでスクロール（これを入れないとクリックできない場合があります）
                await loadMoreButton.scrollIntoViewIfNeeded();
                await loadMoreButton.click();
                
                // 新しい店舗が追加されるのを待機
                await page.waitForTimeout(1500); 
                safetyCounter++;
            } else {
                // ボタンが見つからない ＝ 全件表示完了
                break;
            }
        }

        // --- 2. 一括取得 ---
        const spotRows = await page.locator(DOUTOR_CONFIG.SELECTOR).all();
        const extractedData = [];

        console.log(`  📊 Pref:${prefCode} - Final DOM count: ${spotRows.length}`);

        for (const row of spotRows) {
            const rawText = await row.innerText();
            const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');
            if (lines.length > 0) {
                extractedData.push({
                    rawLines: lines,
                    fetchedAt: new Date().toISOString()
                });
            }
        }
        
        return extractedData;

    } catch (e: any) {
        console.log(`  ℹ️  店舗が存在しないか、読み込みに失敗しました：Pref:${prefCode}`);
        return [];
    }
}

/**
 * [Level 2] Pagination logic
 * 合算表示仕様のため、offset管理が不要になり、1県1回の呼び出しで済むようになります。
 */
async function fetchPrefectureFull(context: BrowserContext, prefCode: string): Promise<any[]> {
    const page = await context.newPage();
    const data = await getDoutorPrefectureData(page, prefCode);
    await page.close();
    return data;
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