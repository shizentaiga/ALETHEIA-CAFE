/**
 * Mister Donuts Fetcher (HTML Scraping Mode)
 * 
 * Usage: npx tsx scripts/brands/004-1_misterdonuts_fetch.ts
 */

import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext, Page } from 'playwright';
import { PATHS, CONFIG, sleep, ensureDirectory } from '../utils.js';
import { PREFECTURE_MASTER } from '../../src/lib/constants';

/**
 * プロバイダー固有の設定
 */
const PROVIDER_CONFIG = {
    BRAND_ID: '004',
    BRAND_NAME: 'misterdonuts',
    OUTPUT_SQL_NAME: '004_misterdonuts.json', // 最終的に出力されるSQLファイル名
    BASE_URL: 'https://md.mapion.co.jp/b/misterdonut/attr/',
    ITEMS_PER_PAGE: 20,
};

/**
 * [レベル 1] 1ページから店舗リストとこだわり条件を抽出
 */
async function scrapeShopList(page: Page): Promise<any[]> {
    return await page.$$eval('li.list-item', (items) => {
        return items.map(item => {
            const name = item.querySelector('.list-content-name')?.textContent?.trim() || '';
            const address = item.querySelector('.list-content-text')?.textContent?.trim() || '';
            
            // 座標情報の取得
            const distanceDiv = item.querySelector('.js-distance-string');
            const lat = distanceDiv?.getAttribute('data-lat') ? parseFloat(distanceDiv.getAttribute('data-lat')!) : null;
            const lng = distanceDiv?.getAttribute('data-lng') ? parseFloat(distanceDiv.getAttribute('data-lng')!) : null;

            // 詳細URLと店舗ID
            const href = item.querySelector('a')?.getAttribute('href') || '';
            const idMatch = href.match(/\/info\/(\d+)\//);
            const id = idMatch ? idMatch[1] : '';

            // こだわり条件（アイコン）の全取得
            const icons = Array.from(item.querySelectorAll('.list-content-icon img'))
                .map(img => img.getAttribute('alt') || '');

            return {
                id,
                name,
                address,
                location: { lat, lng },
                url: `https://md.mapion.co.jp${href}`,
                // こだわり条件のフラグ化
                services: {
                    is_net_order: icons.some(s => s.includes('ネットオーダー')),
                    is_demaecan: icons.some(s => s.includes('出前館')),
                    is_ubereats: icons.some(s => s.includes('Uber Eats')),
                    has_parking: icons.some(s => s.includes('駐車場')),
                    has_drive_thru: icons.some(s => s.includes('ドライブスルー')),
                    has_buffet: icons.some(s => s.includes('ドーナツビュッフェ')), // 食べ放題フラグ
                    has_pop_buffet: icons.some(s => s.includes('ドーナツポップつめ放題')),
                    smoking_status: icons.find(s => s.includes('禁煙') || s.includes('分煙')) || '不明',
                    has_yamcha: icons.some(s => s.includes('飲茶')),
                    has_espresso: icons.some(s => s.includes('エスプレッソ'))
                },
                raw_icons: icons // デバッグ用に元データも保持
            };
        });
    });
}

/**
 * [レベル 2] 都道府県内の全ページをクロール
 */
async function fetchPrefectureFull(context: BrowserContext, prefCode: string, globalSeen: Set<string>): Promise<any[]> {
    const page = await context.newPage();
    const shopsInPref: any[] = [];
    let currentPage = 1;

    try {
        while (true) {
            const url = `${PROVIDER_CONFIG.BASE_URL}?kencode=${prefCode}&t=attr_con&start=${currentPage}`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // ページ情報の取得 (window.pageState を利用)
            const pageState = await page.evaluate(() => (window as any).pageState);
            if (!pageState) break;

            const pageShops = await scrapeShopList(page);
            
            let newCount = 0;
            for (const shop of pageShops) {
                const uniqueKey = `${PROVIDER_CONFIG.BRAND_NAME}_${shop.id}`;
                if (!globalSeen.has(uniqueKey)) {
                    globalSeen.add(uniqueKey);
                    shopsInPref.push({
                        ...shop,
                        fetchedAt: new Date().toISOString()
                    });
                    newCount++;
                }
            }

            console.log(`  📍 都道府県:${prefCode} (${currentPage}/${pageState.endPage}) - 取得: ${pageShops.length}, 新規: ${newCount}`);

            if (currentPage >= pageState.endPage) break;
            currentPage++;
            await sleep(CONFIG.WAIT_SHORT); // デフォルト 2000ms
        }
    } catch (e) {
        console.error(`  ⚠️ 都道府県 ${prefCode} のページ ${currentPage} でエラーが発生しました:`, e);
    } finally {
        await page.close();
    }

    return shopsInPref;
}

/**
 * [レベル 3] メインオーケストレーター
 */
async function main() {
    console.log("🍩 ミスタードーナツのデータ取得を開始します...");

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });

    const globalSeen = new Set<string>();
    const prefCodes = Object.keys(PREFECTURE_MASTER).filter(key => !isNaN(Number(key)));
    const allHits: any[] = [];

    // 並行実行（utils.tsのCONFIG.CONCURRENCYを使用）
    for (let i = 0; i < prefCodes.length; i += CONFIG.CONCURRENCY) {
        const chunk = prefCodes.slice(i, i + CONFIG.CONCURRENCY);
        console.log(`📦 バッチ処理中: ${chunk.join(', ')}...`);

        const results = await Promise.all(chunk.map(code => {
            return fetchPrefectureFull(context, code, globalSeen);
        }));
        
        allHits.push(...results.flat());

        if (i + CONFIG.CONCURRENCY < prefCodes.length) {
            await sleep(CONFIG.WAIT_LONG); // バッチ間の待機
        }
    }

    await browser.close();
    saveResults(allHits);
}

/**
 * 取得結果を保存
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