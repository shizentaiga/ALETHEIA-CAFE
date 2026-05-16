// Usage: npx tsx scripts/brands/004-1-2_misdo_fetch_detail.ts
// Output：scripts/data/raw/004-2_misdo_detail.json

import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext } from 'playwright';
import { PATHS, sleep, ensureDirectory } from '../utils.js';

const CONFIG = {
    INPUT_FILE: '004_misdo.json',
    OUTPUT_FILE: '004-2_misdo_detail.json',
    BASE_DETAIL_URL: 'https://md.mapion.co.jp/b/misterdonut/info/',
    TEST_LIMIT: 2000,          // リミット件数 (全件処理時は null または Infinity にしてください)
    BATCH_SIZE: 5,          // 同時並行数
    INCREMENTAL_MODE: false // ★ true: 差分追記モード / false: 通常モード（全件上書き）
};

interface ShopInput {
    id: string;
    url: string;
    [key: string]: any;
}

async function main() {
    console.log("🍩 ミスタードーナツ詳細データの取得を開始します...");

    const inputPath = path.join(PATHS.RAW_DATA, CONFIG.INPUT_FILE);
    const outputPath = path.join(PATHS.RAW_DATA, CONFIG.OUTPUT_FILE);

    if (!fs.existsSync(inputPath)) {
        console.error(`❌ インプットファイルが見つかりません: ${inputPath}`);
        process.exit(1);
    }

    // 1. インプットデータの読み込み
    const rawInput = fs.readFileSync(inputPath, 'utf-8');
    let allShops: ShopInput[] = JSON.parse(rawInput);

    // テストリミットの適用
    if (CONFIG.TEST_LIMIT && CONFIG.TEST_LIMIT > 0) {
        console.log(`⚠️ テストモード: 最初の方の ${CONFIG.TEST_LIMIT} 件のみ処理します。`);
        allShops = allShops.slice(0, CONFIG.TEST_LIMIT);
    }

    // 2. 既存の出力データの読み込み（差分追記モード用）
    let existingDetails: any[] = [];
    const completedIds = new Set<string>();

    if (CONFIG.INCREMENTAL_MODE && fs.existsSync(outputPath)) {
        try {
            existingDetails = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
            existingDetails.forEach((detail: any) => {
                if (detail && detail.id) {
                    completedIds.add(detail.id);
                }
            });
            console.log(`🔄 差分追記モード: 既に取得済みの ${completedIds.size} 件をスキップします。`);
        } catch (e) {
            console.warn("⚠️ 既存の出力ファイルのパースに失敗しました。新規作成します。", e);
        }
    }

    // 未処理の店舗のみにフィルタリング
    const targetShops = allShops.filter(shop => !completedIds.has(shop.id));
    console.log(`📊 処理対象店舗数: ${targetShops.length} 件 / 総件数: ${allShops.length} 件`);

    if (targetShops.length === 0) {
        console.log("✨ 処理対象の店舗がありません。終了します。");
        return;
    }

    // 3. ブラウザの起動
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
    });

    const results: any[] = [...existingDetails];
    ensureDirectory(PATHS.RAW_DATA);

    // 4. バッチ並行処理オーケストレーター
    for (let i = 0; i < targetShops.length; i += CONFIG.BATCH_SIZE) {
        const chunk = targetShops.slice(i, i + CONFIG.BATCH_SIZE);
        console.log(`📦 バッチ処理中 (${i + 1}〜${Math.min(i + CONFIG.BATCH_SIZE, targetShops.length)} / ${targetShops.length})...`);

        const batchResults = await Promise.all(
            chunk.map(shop => fetchShopDetail(context, shop))
        );

        // 有効なデータのみを追加して都度保存（途中で落ちてもデータを守るため）
        for (const res of batchResults) {
            if (res) {
                results.push(res);
            }
        }

        // 進行状況をファイルに書き出し
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

        // サーバー負荷軽減のためのウェイト (必要に応じて utils の定数に変えてください)
        if (i + CONFIG.BATCH_SIZE < targetShops.length) {
            await sleep(1500); 
        }
    }

    await browser.close();

    
    console.log(`\n✨ すべての詳細データ取得が完了しました！総レコード数: ${results.length}`);
    console.log(`💾 保存先: ${outputPath}`);
}

/**
 * 1つの店舗の詳細ページから window.infoJSON を引っこ抜く関数
 */
async function fetchShopDetail(context: BrowserContext, shop: ShopInput): Promise<any | null> {
    const page = await context.newPage();
    // もし既存のURLがあればそれを利用、なければIDから組み立て
    const url = shop.url || `${CONFIG.BASE_DETAIL_URL}${shop.id}/`;

    try {
        // window.infoJSON さえ生成されれば良いため、domcontentloaded で早期終了させる
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // ページ内の window.infoJSON を取得
        const infoJSON = await page.evaluate(() => (window as any).infoJSON);

        if (!infoJSON) {
            console.warn(`  ⚠️ 店舗 ID:${shop.id} のページに window.infoJSON が見つかりませんでした。`);
            return {
                id: shop.id,
                url: url,
                error: 'infoJSON_not_found',
                fetchedAt: new Date().toISOString()
            };
        }

        console.log(`  ✅ 取得成功: [${shop.id}] ${infoJSON.name || '名称不明'}`);

        return {
            id: shop.id,
            url: url,
            ...infoJSON, // 取得したすべての詳細フィールドを展開してマージ
            fetchedAt: new Date().toISOString()
        };

    } catch (e: any) {
        console.error(`  ❌ 店舗 ID:${shop.id} の取得中にエラーが発生しました:`, e.message);
        return {
            id: shop.id,
            url: url,
            error: e.message,
            fetchedAt: new Date().toISOString()
        };
    } finally {
        await page.close();
    }
}

main().catch(err => {
    console.error("❌ 致命的なエラー:", err);
    process.exit(1);
});