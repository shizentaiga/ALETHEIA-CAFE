//  npx tsx scripts/brands/001_starbucks/001-1-2_stabucks_fetch_detail.ts

// ⭐️Rowデータを取得する予定だったが、SQL文に近い形式で取得。(ほぼconvert済み。area_idは誤りのため注意。)

/**
 * ①JSONファイルから店舗のURLを読み込み
 * ②店舗URLにアクセス
 * ③詳細情報を取得
 */

import fs from 'fs-extra';
import path from 'path';
import { chromium, Page } from 'playwright';

// =============================================================================
// 1. 設定 & 型定義
// =============================================================================
const CONFIG = {
    INPUT_FILE: path.join(process.cwd(), 'scripts/data/raw/001_starbucks.json'),
    OUTPUT_FILE: path.join(process.cwd(), 'scripts/data/raw/001-2_starbucks_detail.json'),
    BASE_DETAIL_URL: 'https://store.starbucks.co.jp/detail-',
    TEST_LIMIT: null,              // リミット件数（全件処理時は null または Infinity）
    BATCH_SIZE: 5,               // 同時並行数
    INCREMENTAL_MODE: false      // true: 差分追記モード / false: 通常モード
};

// スキーマ設計に準拠した出力データのインターフェース
interface ServiceLocation {
    service_id: string;
    brand_id: string;
    owner_id: string | null;
    plan_id: string;
    area_id: string | null;
    title: string;
    address: string;
    lat: number | null;
    lng: number | null;
    website_url: string | null;
    schedule_json: string;    // iCalendar-based JSON String
    attributes_json: string;  // Strict Dynamic Attributes JSON String
    created_at?: string;
    updated_at?: string;
}

// ターゲットサイトの JSON-LD 構造定義
interface StarbucksJsonLd {
    name?: string;
    address?: {
        postalCode?: string;
        addressRegion?: string;
        addressLocality?: string;
        streetAddress?: string;
    };
    telephone?: string;
}

// =============================================================================
// 2. ヘルパー関数群
// =============================================================================

/**
 * RAWデータの営業時間を iCalendar 互換の schedule_json 形式へ変換
 */
function buildScheduleJson(fields: any): string {
    const daysMap: { [key: string]: string } = {
        mon: 'MO', tue: 'TU', wed: 'WE', thu: 'TH', fri: 'FR', sat: 'SA', sun: 'SU'
    };
    
    const baseSlots: any[] = [];

    for (const [key, ic_day] of Object.entries(daysMap)) {
        const open = fields[`${key}_open`];
        const close = fields[`${key}_close`];
        if (open && close && open !== '00:00' && close !== '00:00') {
            baseSlots.push({
                days: [ic_day],
                slots: [{ start: open, end: close }]
            });
        }
    }

    return JSON.stringify({
        base: baseSlots,
        exclude_holidays: fields.hol_open ? true : false
    });
}

/**
 * スキーマで厳選されたキーのみを持つ attributes_json を生成
 */
function buildAttributesJson(fields: any, jsonLd: StarbucksJsonLd): string {
    return JSON.stringify({
        category: 'cat_cafe',
        wifi: fields.public_wireless_service_flg === '1',
        outlets: null, // 必要に応じて判定ロジックを追加
        parking: null,
        takeout: true,
        smoking: false,
        cash_only: false,
        buffet: false,
        pop_buffet: false,
        free_refill: false,
        baby: null,
        business_hours: fields.business_day_mon_thu || null
    });
}

/**
 * 1つの店舗をスクレイピング・マッピングする独立タスク
 */
async function processStore(page: Page, storeRaw: any): Promise<ServiceLocation | null> {
    const fields = storeRaw.fields;
    const storeId = fields.store_id;
    if (!storeId) return null;

    const detailUrl = `${CONFIG.BASE_DETAIL_URL}${storeId}/`;
    
    try {
        // 詳細ページへ遷移
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // JSON-LDの抽出
        const jsonLdRaw = await page.evaluate(() => {
            const script = document.querySelector('script[type="application/ld+json"]');
            return script ? script.textContent : null;
        });

        let jsonLd: StarbucksJsonLd = {};
        if (jsonLdRaw) {
            try {
                jsonLd = JSON.parse(jsonLdRaw);
            } catch (e) {
                console.warn(`[Warning] Failed to parse JSON-LD for store_id: ${storeId}`);
            }
        }

        // 位置情報のパース (location = "lat,lng")
        let lat: number | null = null;
        let lng: number | null = null;
        if (fields.location) {
            const coords = fields.location.split(',');
            if (coords.length === 2) {
                lat = parseFloat(coords[0]);
                lng = parseFloat(coords[1]);
            }
        }

        // スキーマ構造へマッピング
        return {
            service_id: `STB_${storeId}`,
            brand_id: 'brand_starbucks',
            owner_id: null,
            plan_id: 'free',
            area_id: fields.pref_code ? fields.pref_code.toString().padStart(2, '0') : null,
            title: jsonLd.name || fields.name || '',
            address: fields.address_5 || '',
            lat,
            lng,
            website_url: detailUrl,
            schedule_json: buildScheduleJson(fields),
            attributes_json: buildAttributesJson(fields, jsonLd)
        };

    } catch (error) {
        console.error(`[Error] Failed to process store_id ${storeId}:`, error);
        return null;
    }
}

// =============================================================================
// 3. メイン実行フロー
// =============================================================================
async function main() {
    console.log('🚀 Starting Starbucks Detail Fetcher...');

    // 既存データの読み込み
    if (!await fs.pathExists(CONFIG.INPUT_FILE)) {
        console.error(`Input file not found at: ${CONFIG.INPUT_FILE}`);
        process.exit(1);
    }
    const rawData = await fs.readJson(CONFIG.INPUT_FILE);
    
    // リミット制限の適用
    let storesToProcess = Array.isArray(rawData) ? rawData : [];
    if (CONFIG.TEST_LIMIT && CONFIG.TEST_LIMIT < storesToProcess.length) {
        storesToProcess = storesToProcess.slice(0, CONFIG.TEST_LIMIT);
    }

    // 差分追記モードの処理
    let existingResults: ServiceLocation[] = [];
    if (CONFIG.INCREMENTAL_MODE && await fs.pathExists(CONFIG.OUTPUT_FILE)) {
        existingResults = await fs.readJson(CONFIG.OUTPUT_FILE);
        const processedIds = new Set(existingResults.map(r => r.service_id.replace('STB_', '')));
        storesToProcess = storesToProcess.filter(s => !processedIds.has(s.fields?.store_id));
    }

    console.log(`📋 Total targets to crawl: ${storesToProcess.length}`);
    if (storesToProcess.length === 0) {
        console.log('✅ No new stores to process.');
        return;
    }

    // ブラウザの起動
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    
    const results: ServiceLocation[] = [...existingResults];

    // バッチ（チャンク）単位での並行処理
    for (let i = 0; i < storesToProcess.length; i += CONFIG.BATCH_SIZE) {
        const chunk = storesToProcess.slice(i, i + CONFIG.BATCH_SIZE);
        console.log(`⏳ Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1} (${i + 1} ~ ${Math.min(i + CONFIG.BATCH_SIZE, storesToProcess.length)})`);

        const promises = chunk.map(async (storeRaw) => {
            const page = await context.newPage();
            // 不要なリソースを排除して高速化・コスト削減
            await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,css,woff,pdf}', route => route.abort());
            
            const res = await processStore(page, storeRaw);
            await page.close();
            return res;
        });

        const batchResults = await Promise.all(promises);
        for (const res of batchResults) {
            if (res) results.push(res);
        }

        // 進捗を都度保存（バッチごとのセーフティセーブ）
        await fs.ensureDir(path.dirname(CONFIG.OUTPUT_FILE));
        await fs.writeJson(CONFIG.OUTPUT_FILE, results, { spaces: 2 });
    }

    await browser.close();
    console.log(`🎉 Process finished. Output saved to: ${CONFIG.OUTPUT_FILE}`);
}

main().catch(console.error);