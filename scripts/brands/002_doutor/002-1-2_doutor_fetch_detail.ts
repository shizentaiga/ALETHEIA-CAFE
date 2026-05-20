// Usage: npx tsx scripts/brands/002_doutor/002-1-2_doutor_fetch_detail.ts
// Output：scripts/data/raw/002-2_dotor_detail.json

/**
 * ①JSONファイルから店舗のURLを読み込み
 * ②店舗URLにアクセス
 * ③詳細情報を取得
 */

import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext } from 'playwright';
import { PATHS, sleep, ensureDirectory, CONFIG as UTIL_CONFIG } from '../../utils.js';

const CONFIG = {
    INPUT_FILE: '002_doutor.json',
    OUTPUT_FILE: '002-2_doutor_detail.json',
    BASE_DETAIL_URL: 'https://shop.doutor.co.jp/doutor/spot/detail?code=',
    TEST_LIMIT: 2000,            // リミット件数（全件処理時は null または Infinity にしてください）
    BATCH_SIZE: UTIL_CONFIG.CONCURRENCY || 5, // 同時並行数
    INCREMENTAL_MODE: false    // true: 差分追記モード / false: 通常モード（全件上書き）
};

interface ShopInput {
    url: string;
    [key: string]: any;
}

// ドトールのコードをURLから、またはデータから安全に抽出するヘルパー
function getShopId(shop: ShopInput): string {
    if (shop.id) return shop.id;
    const urlObj = new URL(shop.url);
    return urlObj.searchParams.get('code') || 'unknown';
}

async function main() {
    console.log("☕ ドトールコーヒーショップ詳細データの取得を開始します...");

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
    const targetShops = allShops.filter(shop => !completedIds.has(getShopId(shop)));
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

        // 有効なデータのみを追加して都度保存
        for (const res of batchResults) {
            if (res) {
                results.push(res);
            }
        }

        // 進行状況をファイルに書き出し
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

        // サーバー負荷軽減のためのウェイト
        if (i + CONFIG.BATCH_SIZE < targetShops.length) {
            await sleep(UTIL_CONFIG.WAIT_SHORT || 1500); 
        }
    }

    await browser.close();

    console.log(`\n✨ すべての詳細データ取得が完了しました！総レコード数: ${results.length}`);
    console.log(`💾 保存先: ${outputPath}`);
}

/**
 * ページソースの script タグ内から、正規表現で spotDetail の JSON 部分を抽出する関数
 */
async function fetchShopDetail(context: BrowserContext, shop: ShopInput): Promise<any | null> {
    const page = await context.newPage();
    const shopId = getShopId(shop);
    const url = shop.url || `${CONFIG.BASE_DETAIL_URL}${shopId}`;

    try {
        // DOM構築のタイミングでストップさせて最速で取得
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // ページ内のすべての <script> タグのテキストコンテンツを走査
        const scripts = await page.$$eval('script', tags => tags.map(t => t.textContent || ''));
        
        let spotDetail: any = null;

        // spotDetail = { ... } のパターンを探す
        for (const scriptContent of scripts) {
            if (scriptContent.includes('spotDetail =')) {
                // spotDetail = から直後のオブジェクトの終わり（};）までを抽出する正規表現
                const match = scriptContent.match(/spotDetail\s*=\s*(\{[\s\S]*?\});/);
                if (match && match[1]) {
                    try {
                        spotDetail = JSON.parse(match[1]);
                        break;
                    } catch (parseErr) {
                        console.warn(`  ⚠️ JSONパースに失敗しました [ID:${shopId}]`);
                    }
                }
            }
        }

        if (!spotDetail) {
            console.warn(`  ⚠️ 店舗 ID:${shopId} のスクリプトから spotDetail を抽出できませんでした。`);
            return {
                id: shopId,
                url: url,
                error: 'spotDetail_extraction_failed',
                fetchedAt: new Date().toISOString()
            };
        }

        console.log(`  ✅ 取得成功: [${shopId}] ${spotDetail.name || '名称不明'}`);

        // 構造化されたクリーンなデータを返却
        const cleanData = transformData(spotDetail);
        return {
            id: shopId,
            url: url,
            ...cleanData,
            fetchedAt: new Date().toISOString()
        };

    } catch (e: any) {
        console.error(`  ❌ 店舗 ID:${shopId} の取得中にエラーが発生しました:`, e.message);
        return {
            id: shopId,
            url: url,
            error: e.message,
            fetchedAt: new Date().toISOString()
        };
    } finally {
        await page.close();
    }
}

/**
 * 生の spotDetail から使いやすい指定フォーマットへ安全にマッピング・変換
 */
function transformData(d: any) {
    // 設備・決済フラグを安全に判定するヘルパー
    const getFlag = (cols: any[], label: string) => {
        if (!cols) return false;
        return cols.find(c => c.label === label)?.value === 'true';
    };

    // 特定セクションを名前ベースで安全に取得するヘルパー
    const getSection = (name: string) => {
        return d.detailColumns?.find((c: any) => c.name === name)?.columns || {};
    };

    const hourSection = getSection("営業時間情報");
    const facilitySection = getSection("施設・設備");
    const paymentSection = getSection("決済方法");

    return {
        shop_info: {
            shop_code: d.code || "",
            name: d.name || "",
            lat: d.lat ? parseFloat(d.lat) : null,
            lon: d.lon ? parseFloat(d.lon) : null,
            address: d.addressName || ""
        },
        business_hours: {
            weekday:  { time: hourSection.text?.[0]?.value || "", lo: hourSection.text?.[1]?.value || "" },
            saturday: { time: hourSection.text?.[2]?.value || "", lo: hourSection.text?.[3]?.value || "" },
            holiday:  { time: hourSection.text?.[4]?.value || "", lo: hourSection.text?.[5]?.value || "" }
        },
        facilities: {
            wifi: getFlag(facilitySection.flag, "FREE Wi-Fi"),
            outlet: getFlag(facilitySection.flag, "コンセント"),
            smoking_policy: facilitySection.text?.find((t: any) => t.label === "分煙種別")?.value || "不明",
            seats_total: parseInt(facilitySection.text?.find((t: any) => t.label === "総席数")?.value || "0", 10),
            seats_non_smoking: parseInt(facilitySection.text?.find((t: any) => t.label === "総禁煙席数")?.value || "0", 10),
            seats_smoking: parseInt(facilitySection.text?.find((t: any) => t.label === "総喫煙席数")?.value || "0", 10)
        },
        payment_methods: {
            value_card: getFlag(paymentSection.flag, "ドトール バリューカード"),
            credit_card: getFlag(paymentSection.flag, "クレジットカード"),
            e_money: getFlag(paymentSection.flag, "電子マネー"),
            qr_pay: getFlag(paymentSection.flag, "コード決済"),
            qr_details: paymentSection.flag
                ? paymentSection.flag
                    .filter((f: any) => f.image_path?.includes('cashless_pay-'))
                    .map((f: any) => f.label)
                : []
        }
    };
}

main().catch(err => {
    console.error("❌ 致命的なエラー:", err);
    process.exit(1);
});