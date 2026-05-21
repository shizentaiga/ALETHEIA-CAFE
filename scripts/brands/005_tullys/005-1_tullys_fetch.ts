/**
 * Tullys Coffee Fetcher (HTML Scraping Mode)
 * 
 * Usage: npx tsx scripts/brands/005_tullys/005-1_tullys_fetch.ts
 */

import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { PATHS, CONFIG, sleep, ensureDirectory, getBrandId } from '../../utils.js';
import { PREFECTURE_MASTER } from '../../../src/lib/constants.js';

/**
 * プロバイダー固有の設定
 */
const PROVIDER_CONFIG = {
    // 既存のCONFIG.BRANDS構造に準拠させる場合は getBrandId('TULLYS') も使用可能ですが、
    // 固定値指定の要件に沿って以下のように定義します
    BRAND_ID: '005',
    BRAND_NAME: 'tullys',
    OUTPUT_JSON_NAME: '005_tullys.json', // 最終的に出力される生のJSON
    BASE_URL: 'https://shop.tullys.co.jp/all',  // 全国一覧ページ
};

// 型定義（抽出する店舗情報のインターフェース）
interface RawStoreData {
    id: string;
    name: string;
    prefecture: string;
    address: string;
    hours: string;
    phone: string;
    url: string;
}

async function run() {
    console.log(`[${PROVIDER_CONFIG.BRAND_NAME.toUpperCase()}] スクレイピングを開始します...`);

    // 1. 保存先ディレクトリの準備
    ensureDirectory(PATHS.RAW_DATA);
    const outputPath = path.join(PATHS.RAW_DATA, PROVIDER_CONFIG.OUTPUT_JSON_NAME);

    // 2. ブラウザの起動
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        // 3. 全店舗一覧ページへアクセス
        console.log(`URLへアクセス中: ${PROVIDER_CONFIG.BASE_URL}`);
        await page.goto(PROVIDER_CONFIG.BASE_URL, { waitUntil: 'domcontentloaded' });
        
        // 既存の共通待機時間を適用（安全マージン）
        await sleep(CONFIG.WAIT_SHORT);

        // 4. ブラウザ環境内でHTMLを解析し、全件一括抽出
        console.log('HTMLから店舗データを抽出しています...');
        const stores: RawStoreData[] = await page.evaluate((baseUrl) => {
            // 店名要素のクラス（.store__header）を基準に全ての店舗枠を取得
            const headers = document.querySelectorAll('.store__header');
            
            return Array.from(headers).map(header => {
                // 確実に親の枠組み（各店舗のカード単位のコンテナ）を捉える
                const container = header.closest('.store-list__item') || header.parentElement;
                if (!container) return null;

                // 各要素の抽出
                const nameEl = container.querySelector('.store__name');
                const addressEl = container.querySelector('.store__address');
                const hourEl = container.querySelector('.store__hour span');
                const phoneEl = container.querySelector('.store__phone');
                const linkEl = container.querySelector('.store__link');

                // 詳細ページのURLから一意の店舗IDを切り出す (例: /detail/5023057 -> 5023057)
                const href = linkEl?.getAttribute('href') || '';
                const idMatch = href.match(/\/detail\/(\d+)/);
                const id = idMatch ? idMatch[1] : '';

                // 住所から都道府県を判別するための下準備（空文字の場合は住所そのまま）
                const fullAddress = addressEl?.textContent?.trim() || '';

                return {
                    id: id,
                    name: nameEl?.textContent?.trim() || '',
                    prefecture: '', // 後段のNode.js環境でPREFECTURE_MASTERを突合して確定させる
                    address: fullAddress,
                    hours: hourEl?.textContent?.trim() || '',
                    phone: phoneEl?.textContent?.trim() || '',
                    url: href ? new URL(href, baseUrl).href : ''
                };
            }).filter((store): store is RawStoreData => store !== null && store.name !== '');
        }, PROVIDER_CONFIG.BASE_URL);

        // 5. Node.js環境でPREFECTURE_MASTERを用いて都道府県名をマッピング・補正
        console.log('都道府県マスターとのマッピング処理を実行中...');
        const finalizedStores = stores.map(store => {
            // 住所の先頭文字列から、PREFECTURE_MASTERに含まれる都道府県名（北海道、東京都、京都府など）を探す
            const detectedPref = Object.values(PREFECTURE_MASTER).find(prefName => 
                store.address.startsWith(prefName)
            );

            return {
                ...store,
                prefecture: detectedPref || 'その他' // マッチしない場合のフォールバック
            };
        });

        // 6. データの保存
        fs.writeFileSync(outputPath, JSON.stringify(finalizedStores, null, 2), 'utf-8');
        console.log(`成功: ${finalizedStores.length} 件の店舗データを保存しました。 -> ${outputPath}`);

    } catch (error) {
        console.error('スクレイピング中にエラーが発生しました:', error);
    } finally {
        // 7. ブラウザのクローズ
        await context.close();
        await browser.close();
        console.log('ブラウザを終了しました。');
    }
}

// 実行
run();