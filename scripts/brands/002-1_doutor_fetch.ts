/**
 * Doutor Coffee Shop Data Fetcher (Hybrid Deduplication Mode)
 * Usage: npx tsx scripts/brands/002-1_doutor_fetch.ts
 * 
 * 【主キー生成戦略: service_id の不変性確保】
 * 1. 優先：電話番号（ハイフン除去）
 * 2. 次点：店名 ＋ 住所 のハッシュ値
 */

import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext, Page } from 'playwright';
import { PATHS, CONFIG, sleep, ensureDirectory } from '../utils.js';

/**
 * プロバイダー固有の設定
 */
const PROVIDER_CONFIG = {
    BRAND_ID: '002',
    BRAND_NAME: 'doutor',
    OUTPUT_SQL_NAME: '002_doutor.json', // 最終的に出力されるSQLファイル名
    BASE_URL: 'https://shop.doutor.co.jp/doutor/spot/list',
    SELECTOR: '.copper-list-items',
    LIMIT_STEP: 50,         // 1回のリクエストで増加させる件数
    MAX_PAGES: 20,          // セーフガード: 1つの都道府県につき最大 1,000 件まで
    BATCH_SIZE: 3           // メモリ消費を抑えるための並行実行数
};

/**
 * [レベル 1] "limit" パラメータを増やしてページデータを取得
 * ドトールのAPIは、開始地点から指定されたリミットまでの全レコードを返します。
 */
async function getDoutorPageData(page: Page, prefCode: string, currentTotalExpected: number): Promise<any[]> {
    // 動的なレンダリングに対応するため、オフセット0から現在のリミットまでの全レコードを要求
    const url = `${PROVIDER_CONFIG.BASE_URL}?limit=${currentTotalExpected}&address=${prefCode}&offset=0`;
    
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(1500); // クライアントサイドのレンダリング時間を確保
        await page.waitForSelector(PROVIDER_CONFIG.SELECTOR, { timeout: 8000 });
        
        const spotRows = await page.locator(PROVIDER_CONFIG.SELECTOR).all();
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
 * [レベル 2] 都道府県内の全店舗を重複排除しながら取得
 */
async function fetchPrefectureFull(context: BrowserContext, prefCode: string, globalSeen: Set<string>): Promise<any[]> {
    const page = await context.newPage();
    const hitsInPref: any[] = [];
    let currentLimit = PROVIDER_CONFIG.LIMIT_STEP; 
    let pageCount = 0;
    let lastTotalCount = -1;

    while (pageCount < PROVIDER_CONFIG.MAX_PAGES) {
        const data = await getDoutorPageData(page, prefCode, currentLimit);
        
        if (data.length === 0) break;

        // 新しいデータがロードされなかった場合（DOMの件数が変わらない場合）は終了
        if (data.length === lastTotalCount) break;

        let addedInThisLoop = 0;
        for (const item of data) {
            // 重複を防ぐため「名称 + 住所」で一意のキーを作成
            const uniqueKey = `${item.rawLines[0]}_${item.rawLines[1]}`;
            if (!globalSeen.has(uniqueKey)) {
                globalSeen.add(uniqueKey);
                hitsInPref.push(item);
                addedInThisLoop++;
            }
        }

        console.log(`  📍 都道府県:${prefCode} (Limit:${currentLimit}) - DOM合計: ${data.length}, 新規ユニーク: ${addedInThisLoop}`);

        // 返ってきたデータが要求したリミットより少ない場合は、全件取得完了とみなす
        if (data.length < currentLimit) {
            break;
        }

        lastTotalCount = data.length;
        currentLimit += PROVIDER_CONFIG.LIMIT_STEP; // 次のイテレーションでリミットを増加
        pageCount++;
        await sleep(1000);
    }

    await page.close();
    return hitsInPref;
}

/**
 * [レベル 3] メインオーケストレーター
 */
async function main() {
    console.log("🚀 ドトールのデータ取得を開始します（永続重複排除モード）...");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });

    const globalSeen = new Set<string>();
    const prefList = Array.from({ length: 47 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const allHits: any[] = [];

    // メモリ枯渇を防ぐため、並行数を制限してバッチ処理
    const BATCH_SIZE = PROVIDER_CONFIG.BATCH_SIZE; 

    for (let i = 0; i < prefList.length; i += BATCH_SIZE) {
        const chunk = prefList.slice(i, i + BATCH_SIZE);
        console.log(`📦 バッチ処理中: ${chunk.join(', ')}...`);

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
 * 重複排除された最終的なデータセットを JSON ファイルに保存
 */
function saveResults(data: any[]) {
    ensureDirectory(PATHS.RAW_DATA);
    const fileName = PROVIDER_CONFIG.OUTPUT_SQL_NAME; // 設定からファイル名を取得
    const savePath = path.join(PATHS.RAW_DATA, fileName);
    
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
    
    console.log(`\n✨ 完了！総ユニークレコード数: ${data.length}`);
    console.log(`💾 保存先: ${savePath}`);
}

main().catch(err => {
    console.error("❌ 致命的なエラー:", err);
    process.exit(1);
});