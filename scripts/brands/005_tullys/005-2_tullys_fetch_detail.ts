// Usage: npx tsx scripts/brands/005_tullys/005-2_tullys_fetch_detail.ts
// Output：scripts/data/raw/005-2_tullys_detail.json

import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext, Page } from 'playwright';
import { PATHS, sleep, ensureDirectory } from '../../utils.js';

// --- 型定義 ---
interface InputShopSummary {
    id: string;
    name: string;
    prefecture: string;
    address: string;
    hours: string; 
    phone: string;
    url: string;
}

interface OutputShopDetail extends Omit<InputShopSummary, 'hours'> {
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    businessHours: string[];
    hoursRemark: string | null;
    services: string[];
    payments: string[];
    fetchedAt: string;
}

// --- 設定 ---
const CONFIG = {
    INPUT_FILE: '005_tullys.json',
    OUTPUT_FILE: '005-2_tullys_detail.json',
    BASE_DETAIL_URL: 'https://shop.tullys.co.jp/detail/',
    TEST_LIMIT: null,     // nullで制限なし          
    BATCH_SIZE: 5,           
    INCREMENTAL_MODE: false   
};

/**
 * 単一店舗の個別ページを解析する
 */
async function fetchShopDetail(context: BrowserContext, shop: InputShopSummary): Promise<OutputShopDetail> {
    const page: Page = await context.newPage();
    try {
        await page.goto(shop.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // 1. ld+json からクリーンな基礎データを抽出
        const metaData = await page.evaluate(() => {
            const script = document.querySelector('script[type="application/ld+json"]');
            if (!script || !script.textContent) return null;
            try {
                const json = JSON.parse(script.textContent);
                // 配列でラップされているケース（json[0]）と単一オブジェクトのケースに対応
                const data = Array.isArray(json) ? json[0] : json;
                return {
                    postalCode: data?.address?.postalCode || null,
                    latitude: data?.geo?.latitude ? parseFloat(data.geo.latitude) : null,
                    longitude: data?.geo?.longitude ? parseFloat(data.geo.longitude) : null,
                };
            } catch {
                return null;
            }
        });

        // 2. DOMから曜日別の固定営業時間を抽出
        const businessHours = await page.evaluate(() => {
            const spans = document.querySelectorAll('.business-hour__detail span');
            return Array.from(spans)
                .map(span => (span.textContent || '').trim())
                .filter(Boolean);
        });

        // 3. 営業時間に関する備考（ラストオーダーなど）
        const hoursRemark = await page.evaluate(() => {
            const remarkEl = document.querySelector('.business-hour__remark');
            return remarkEl ? (remarkEl.textContent || '').trim() : null;
        });

        // 4. 設備・サービス（Wi-Fi、禁煙など）と 決済手段（PayPayなど）
        const { services, payments } = await page.evaluate(() => {
            const results = { services: [] as string[], payments: [] as string[] };
            
            // HTML内の「content-item」で構成されたブロックを走査する
            const items = Array.from(document.querySelectorAll('.content-item'));

            for (const item of items) {
                const titleEl = item.querySelector('.content-name');
                if (!titleEl) continue;

                const titleText = (titleEl.textContent || '').trim();

                // QRコード決済
                if (titleText.includes('QRコード決済')) {
                    const itemNames = item.querySelectorAll('.logo-section__item__name');
                    results.payments = Array.from(itemNames)
                        .map(el => (el.textContent || '').trim())
                        .filter(Boolean);
                }

                // 設備・サービス
                if (titleText.includes('設備')) {
                    const itemNames = item.querySelectorAll('.logo-section__item__name');
                    results.services = Array.from(itemNames)
                        .map(el => (el.textContent || '').trim())
                        .filter(Boolean);
                }
            }

            return results;
        });

        console.log(`  ✅ 取得成功: [${shop.id}] ${shop.name}`);

        return {
            id: shop.id,
            name: shop.name,
            prefecture: shop.prefecture,
            address: shop.address,
            phone: shop.phone,
            url: shop.url,
            postalCode: metaData?.postalCode || null,
            latitude: metaData?.latitude || null,
            longitude: metaData?.longitude || null,
            businessHours,
            hoursRemark,
            services,
            payments,
            fetchedAt: new Date().toISOString()
        };

    } catch (e: any) {
        console.error(`  ❌ 店舗 ID:${shop.id} の取得中にエラーが発生しました:`, e.message);
        return {
            id: shop.id,
            name: shop.name,
            prefecture: shop.prefecture,
            address: shop.address,
            phone: shop.phone,
            url: shop.url,
            postalCode: null,
            latitude: null,
            longitude: null,
            businessHours: [],
            hoursRemark: `Error: ${e.message}`,
            services: [],
            payments: [],
            fetchedAt: new Date().toISOString()
        };
    } finally {
        await page.close();
    }
}

/**
 * メイン処理
 */
async function main() {
    console.log("☕ タリーズコーヒー詳細データの取得を開始します...");

    const inputPath = path.join(PATHS.RAW_DATA, CONFIG.INPUT_FILE);
    const outputPath = path.join(PATHS.RAW_DATA, CONFIG.OUTPUT_FILE);
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ 入力ファイルが見つかりません: ${inputPath}`);
        process.exit(1);
    }

    const rawSummary: InputShopSummary[] = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    let allShops = rawSummary;

    if (CONFIG.TEST_LIMIT && CONFIG.TEST_LIMIT > 0) {
        console.log(`⚠️ テストモード: 最初の方の ${CONFIG.TEST_LIMIT} 件のみ処理します。`);
        allShops = allShops.slice(0, CONFIG.TEST_LIMIT);
    }

    let finalResults: OutputShopDetail[] = [];
    const completedIds = new Set<string>();

    if (CONFIG.INCREMENTAL_MODE && fs.existsSync(outputPath)) {
        try {
            finalResults = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
            finalResults.forEach(shop => {
                if (shop && shop.id) {
                    completedIds.add(shop.id);
                }
            });
            console.log(`🔄 差分追記モード: 既に取得済みの ${completedIds.size} 件をスキップします。`);
        } catch (e) {
            console.warn('⚠️ 既存の出力ファイルのパースに失敗しました。新規作成します。');
        }
    }

    const targetShops = allShops.filter(shop => !completedIds.has(shop.id));
    console.log(`📊 処理対象店舗数: ${targetShops.length} 件 / 総件数: ${allShops.length} 件`);

    if (targetShops.length === 0) {
        console.log('✨ 処理対象の店舗がありません。終了します。');
        return;
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });

    ensureDirectory(PATHS.RAW_DATA);
    console.log(`\n🤖 クロール開始 (同時並行数: ${CONFIG.BATCH_SIZE}) ...`);

    for (let i = 0; i < targetShops.length; i += CONFIG.BATCH_SIZE) {
        const chunk = targetShops.slice(i, i + CONFIG.BATCH_SIZE);
        console.log(`📦 バッチ処理中 (${i + 1}〜${Math.min(i + CONFIG.BATCH_SIZE, targetShops.length)} / ${targetShops.length})...`);

        const promises = chunk.map(shop => fetchShopDetail(context, shop));
        const batchResults = await Promise.allSettled(promises);

        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                finalResults.push(result.value);
            } else {
                console.error(`❌ クロールエラー:`, result.reason);
            }
        }

        fs.writeFileSync(outputPath, JSON.stringify(finalResults, null, 2), 'utf-8');

        if (i + CONFIG.BATCH_SIZE < targetShops.length) {
            await sleep(1500);
        }
    }

    await context.close();
    await browser.close();

    console.log(`\n✨ すべての詳細データ取得が完了しました！総レコード数: ${finalResults.length}`);
    console.log(`💾 保存先: ${outputPath}`);
}

main().catch(err => {
    console.error('❌ 致命的なエラーが発生しました:', err);
    process.exit(1);
});