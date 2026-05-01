/**
 * Starbucks Data Fetcher (Refactored for Readability)
 * 
 * Usage: npx tsx scripts/001_starbucks_fetch.ts
 */

import fs from 'fs';
import path from 'path';
import { PATHS, CONFIG, sleep, ensureDirectory } from './utils.js';

interface StarbucksApiResponse {
    hits?: {
        found: number;
        hit: any[];
    };
}

/**
 * [Level 1] Low-level API request
 */
async function fetchStarbucksApi(prefCode: string, start = 0): Promise<StarbucksApiResponse | null> {
    const baseUrl = 'https://hn8madehag.execute-api.ap-northeast-1.amazonaws.com/prd-2019-08-21/storesearch';
    const params = new URLSearchParams({
        size: '100',
        'q.parser': 'structured',
        q: `(and record_type:1 pref_code:${parseInt(prefCode, 10)})`,
        sort: 'store_id asc',
        start: start.toString()
    });

    try {
        const response = await fetch(`${baseUrl}?${params.toString()}`, {
            headers: {
                'origin': 'https://store.starbucks.co.jp',
                'referer': 'https://store.starbucks.co.jp/',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (e: any) {
        console.error(`  ⚠️ Error fetching Pref:${prefCode}: ${e.message}`);
        return null;
    }
}

/**
 * [Level 2] Pagination logic for a single prefecture
 * Deep nesting is isolated here.
 */
async function fetchPrefectureFull(prefCode: string): Promise<any[]> {
    let hitsInPref: any[] = [];
    let start = 0;
    let hasMore = true;

    while (hasMore) {
        const data = await fetchStarbucksApi(prefCode, start);
        if (!data || !data.hits) break;

        const hits = data.hits.hit || [];
        hitsInPref.push(...hits);
        console.log(`  📍 Pref:${prefCode} - Found: ${hits.length} (Total: ${data.hits.found})`);

        start += 100;
        hasMore = start < data.hits.found;

        if (hasMore) await sleep(CONFIG.WAIT_SHORT);
    }
    return hitsInPref;
}

/**
 * [Level 3] Main orchestrator
 * Manages chunking and overall process flow.
 */
async function main() {
    console.log("🚀 Starting Starbucks Data Fetch...");

    const prefList = Array.from({ length: 47 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    let allHits: any[] = [];

    // Chunking the 47 prefectures for concurrency control
    for (let i = 0; i < prefList.length; i += CONFIG.CONCURRENCY) {
        const chunk = prefList.slice(i, i + CONFIG.CONCURRENCY);
        console.log(`📦 Processing Chunk: ${chunk.join(', ')}...`);

        // Execute concurrent requests for the current chunk
        const results = await Promise.all(chunk.map(pref => fetchPrefectureFull(pref)));

        allHits.push(...results.flat().filter(Boolean));

        // Global throttling between chunks
        if (i + CONFIG.CONCURRENCY < prefList.length) {
            await sleep(CONFIG.WAIT_LONG);
        }
    }

    saveResults(allHits);
}

/**
 * Helper to save the final JSON
 */
function saveResults(data: any[]) {
    ensureDirectory(PATHS.RAW_DATA);
    const savePath = path.join(PATHS.RAW_DATA, '001_starbucks.json');
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
    console.log(`\n✨ Done! Total Records: ${data.length}`);
    console.log(`💾 Saved to: ${savePath}`);
}

main();