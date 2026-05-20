/**
 * Komeda Coffee Shop Data Fetcher (Hybrid Deduplication Mode)
 * 
 * Usage: npx tsx scripts/003-1_komeda_fetch.ts
 */

import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext, Page } from 'playwright';
import { PATHS, sleep, ensureDirectory } from '../../utils.js';
import { PREFECTURE_MASTER } from '../../../src/lib/constants';

/**
 * プロバイダー固有の設定
 */
const PROVIDER_CONFIG = {
    BRAND_ID: '003',
    BRAND_NAME: 'komeda',
    OUTPUT_SQL_NAME: '003_komeda.json', // 最終的に出力されるSQLファイル名
    BASE_URL: 'https://eu.komeda.co.jp/v1/hp/shop',
    BRAND_TYPE: 1,      // コメダ珈琲店
    OFFSET_STEP: 20,    // 1回のリクエストで取得する件数
    MAX_PAGES: 50,      // セーフティリミット: 1000件（20件×50回）まで
    BATCH_SIZE: 3       // 同時実行数
};

/**
 * [レベル 1] API経由でJSONデータを取得
 */
async function getKomedaPageData(page: Page, prefName: string, offset: number): Promise<any> {
    const encodedPref = encodeURIComponent(prefName);
    const url = `${PROVIDER_CONFIG.BASE_URL}?prefecture=${encodedPref}&brand_type=${PROVIDER_CONFIG.BRAND_TYPE}&offset=${offset}`;
    
    try {
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        if (!response) return null;
        
        const data = await response.json();
        return data;
    } catch (e) {
        console.error(`  ⚠️ オフセット ${offset} での取得エラー:`, e);
        return null;
    }
}

/**
 * [レベル 2] 都道府県内の全店舗をページングしながら取得
 */
async function fetchPrefectureFull(context: BrowserContext, prefName: string, globalSeen: Set<string>): Promise<any[]> {
    const page = await context.newPage();
    const hitsInPref: any[] = [];
    let currentOffset = 0;
    let pageCount = 0;

    while (pageCount < PROVIDER_CONFIG.MAX_PAGES) {
        const data = await getKomedaPageData(page, prefName, currentOffset);
        
        if (!data || !data.items || data.items.length === 0) {
            break; // データが空（items: []）になったら終了
        }

        let addedInThisLoop = 0;
        for (const item of data.items) {
            // IDを使用してユニークキーを作成
            const uniqueKey = `${PROVIDER_CONFIG.BRAND_NAME}_${item.id}`;
            if (!globalSeen.has(uniqueKey)) {
                globalSeen.add(uniqueKey);
                hitsInPref.push({
                    ...item,
                    fetchedAt: new Date().toISOString()
                });
                addedInThisLoop++;
            }
        }

        console.log(`  📍 ${prefName} (オフセット:${currentOffset}) - 発見: ${data.items.length}, 総期待件数: ${data.total}, 新規: ${addedInThisLoop}`);

        // オフセットがトータル件数を超えた、または全件取得したら終了
        if (currentOffset + PROVIDER_CONFIG.OFFSET_STEP >= data.total) {
            break;
        }

        currentOffset += PROVIDER_CONFIG.OFFSET_STEP;
        pageCount++;
        await sleep(500); // サーバー負荷軽減
    }

    await page.close();
    return hitsInPref;
}

/**
 * [レベル 3] メインオーケストレーター
 */
async function main() {
    console.log("🚀 コメダ珈琲店のデータ取得を開始します（APIページングモード）...");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });

    const globalSeen = new Set<string>();
    
    // ISOコード(01-47)のみを抽出してループ
    const prefCodes = Object.keys(PREFECTURE_MASTER).filter(key => !isNaN(Number(key)));
    const allHits: any[] = [];

    // メモリ消費を抑えるためバッチ処理
    const BATCH_SIZE = PROVIDER_CONFIG.BATCH_SIZE; 

    for (let i = 0; i < prefCodes.length; i += BATCH_SIZE) {
        const chunk = prefCodes.slice(i, i + BATCH_SIZE);
        console.log(`📦 バッチ処理中: ${chunk.join(', ')}...`);

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
 * 取得結果を JSON に保存
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