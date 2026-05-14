/**
 * Starbucks Data Fetcher (Refactored & Secure Version)
 * 
 * Usage: npx tsx scripts/brands/001-1_starbucks_fetch.ts
 * 
 * Features:
 * - Functional decomposition (Lower nesting levels)
 * - Safety limit (Max 5,000 records per prefecture)
 * - Error handling for pagination
 */

import fs from 'fs';
import path from 'path';
import { PATHS, CONFIG, sleep, ensureDirectory } from '../utils.js';

/**
 * プロバイダー固有の設定
 */
const PROVIDER_CONFIG = {
    BRAND_ID: '001',
    BRAND_NAME: 'starbucks',
    OUTPUT_SQL_NAME: '001-1_starbucks.sql', // 最終的に出力されるSQLファイル名
    BASE_URL: 'https://hn8madehag.execute-api.ap-northeast-1.amazonaws.com/prd-2019-08-21/storesearch',
    ORIGIN: 'https://store.starbucks.co.jp',
    REFERER: 'https://store.starbucks.co.jp/',
    PAGE_SIZE: 100,
    MAX_LIMIT_PER_PREF: 5000,
};

interface StarbucksApiResponse {
    hits?: {
        found: number;
        hit: any[];
    };
}

/**
 * [レベル 1] 低レベル API リクエスト
 * スターバックス API との生の HTTP 通信を処理します。
 */
async function fetchStarbucksApi(prefCode: string, start = 0): Promise<StarbucksApiResponse | null> {
    const baseUrl = PROVIDER_CONFIG.BASE_URL;
    
    const params = new URLSearchParams({
        size: PROVIDER_CONFIG.PAGE_SIZE.toString(),
        'q.parser': 'structured',
        q: `(and record_type:1 pref_code:${parseInt(prefCode, 10)})`,
        sort: 'store_id asc',
        start: start.toString()
    });

    try {
        const response = await fetch(`${baseUrl}?${params.toString()}`, {
            headers: {
                'origin': PROVIDER_CONFIG.ORIGIN,
                'referer': PROVIDER_CONFIG.REFERER,
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (e: any) {
        console.error(`  ⚠️  都道府県:${prefCode} の取得エラー: ${e.message}`);
        return null;
    }
}

/**
 * [レベル 2] 単一都道府県内のページネーションロジック
 * 無限ループや過度なメモリ使用を防ぐためのセーフガードを含みます。
 */
async function fetchPrefectureFull(prefCode: string): Promise<any[]> {
    const hitsInPref: any[] = [];
    const PAGE_SIZE = PROVIDER_CONFIG.PAGE_SIZE;
    const MAX_LIMIT = PROVIDER_CONFIG.MAX_LIMIT_PER_PREF; // セーフガード: 1つの都道府県につき 5,000 件以上取得しない
    
    let start = 0;
    let hasMore = true;

    while (hasMore) {
        // 安全制限を超えた場合は停止
        if (start >= MAX_LIMIT) {
            console.warn(`  🛑 都道府県:${prefCode} で安全制限 (最大: ${MAX_LIMIT}) に達しました。残りのレコードをスキップします。`);
            break;
        }

        const data = await fetchStarbucksApi(prefCode, start);
        if (!data || !data.hits) break;

        const hits = data.hits.hit || [];
        hitsInPref.push(...hits);

        const totalFound = data.hits.found;
        console.log(`  📍 都道府県:${prefCode} - 取得済み: ${hitsInPref.length} / 合計: ${totalFound}`);

        // ページネーションポインタを更新
        start += PAGE_SIZE;
        hasMore = start < totalFound;

        if (hasMore) {
            await sleep(CONFIG.WAIT_SHORT); // API 制限を考慮したスロットリング
        }
    }
    return hitsInPref;
}

/**
 * [レベル 3] メインオーケストレーター
 * 全 47 都道府県のチャンク処理を制御します。
 */
async function main() {
    console.log("🚀 スターバックスのデータ取得を開始します...");

    // ["01", "02", ..., "47"] の文字列配列を作成
    const prefList = Array.from({ length: 47 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const allHits: any[] = [];

    // 並行性を制御するため、都道府県をバッチ単位で処理
    for (let i = 0; i < prefList.length; i += CONFIG.CONCURRENCY) {
        const chunk = prefList.slice(i, i + CONFIG.CONCURRENCY);
        console.log(`📦 バッチ処理中: ${chunk.join(', ')}...`);

        // 複数の都道府県を同時に取得
        const results = await Promise.all(chunk.map(pref => fetchPrefectureFull(pref)));

        // 結果をメイン配列に結合
        allHits.push(...results.flat().filter(Boolean));

        // サーバー側のスロットリングを避けるため、次のバッチの前に待機
        if (i + CONFIG.CONCURRENCY < prefList.length) {
            await sleep(CONFIG.WAIT_LONG);
        }
    }

    saveResults(allHits);
}

/**
 * 集約されたデータをファイルに書き込むヘルパー
 */
function saveResults(data: any[]) {
    ensureDirectory(PATHS.RAW_DATA);
    const fileName = PROVIDER_CONFIG.OUTPUT_SQL_NAME; // Configからファイル名を取得
    const savePath = path.join(PATHS.RAW_DATA, fileName);
    
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
    
    console.log(`\n✨ スクレイピング完了！`);
    console.log(`📊 総レコード数: ${data.length}`);
    console.log(`💾 保存先: ${savePath}`);
}

// エントリーポイント用のグローバルエラーハンドラー
main().catch(err => {
    console.error("❌ メイン実行中に致命的なエラーが発生しました:");
    console.error(err);
    process.exit(1);
});