/**
 * Starbucks Data Fetcher (Refactored & Secure Version)
 * 
 * Usage: npx tsx scripts/001_starbucks_fetch.ts
 * 
 * Features:
 * - Functional decomposition (Lower nesting levels)
 * - Safety limit (Max 5,000 records per prefecture)
 * - Error handling for pagination
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
 * [Level 1] Low-level API Request
 * Handles the raw HTTP communication with the Starbucks API.
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
        console.error(`  ⚠️  Error fetching Pref:${prefCode}: ${e.message}`);
        return null;
    }
}

/**
 * [Level 2] Pagination logic for a single prefecture
 * Includes a safety guard to prevent infinite loops or excessive memory usage.
 */
async function fetchPrefectureFull(prefCode: string): Promise<any[]> {
    const hitsInPref: any[] = [];
    const PAGE_SIZE = 100;
    const MAX_LIMIT = 5000; // Safety guard: Do not fetch more than 5,000 stores per prefecture
    
    let start = 0;
    let hasMore = true;

    while (hasMore) {
        // Stop if we exceed the safety limit
        if (start >= MAX_LIMIT) {
            console.warn(`  🛑 Safety limit reached (Max: ${MAX_LIMIT}) for Pref:${prefCode}. Skipping remaining records.`);
            break;
        }

        const data = await fetchStarbucksApi(prefCode, start);
        if (!data || !data.hits) break;

        const hits = data.hits.hit || [];
        hitsInPref.push(...hits);

        const totalFound = data.hits.found;
        console.log(`  📍 Pref:${prefCode} - Fetched: ${hitsInPref.length} / Total: ${totalFound}`);

        // Update pagination pointer
        start += PAGE_SIZE;
        hasMore = start < totalFound;

        if (hasMore) {
            await sleep(CONFIG.WAIT_SHORT); // Throttling to respect API limits
        }
    }
    return hitsInPref;
}

/**
 * [Level 3] Main orchestrator
 * Orchestrates the chunked processing of all 47 prefectures.
 */
async function main() {
    console.log("🚀 Starting Starbucks Data Fetch...");

    // Create array of strings ["01", "02", ..., "47"]
    const prefList = Array.from({ length: 47 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const allHits: any[] = [];

    // Process prefectures in batches to control concurrency
    for (let i = 0; i < prefList.length; i += CONFIG.CONCURRENCY) {
        const chunk = prefList.slice(i, i + CONFIG.CONCURRENCY);
        console.log(`📦 Processing Batch: ${chunk.join(', ')}...`);

        // Fetch multiple prefectures simultaneously
        const results = await Promise.all(chunk.map(pref => fetchPrefectureFull(pref)));

        // Combine results into the main array
        allHits.push(...results.flat().filter(Boolean));

        // Wait before the next batch to avoid server-side throttling
        if (i + CONFIG.CONCURRENCY < prefList.length) {
            await sleep(CONFIG.WAIT_LONG);
        }
    }

    saveResults(allHits);
}

/**
 * Helper to write the aggregated data to a file.
 */
function saveResults(data: any[]) {
    ensureDirectory(PATHS.RAW_DATA);
    const savePath = path.join(PATHS.RAW_DATA, '001_starbucks.json');
    
    fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
    
    console.log(`\n✨ Scraping Complete!`);
    console.log(`📊 Total Records: ${data.length}`);
    console.log(`💾 Data saved to: ${savePath}`);
}

// Global error handler for the entry point
main().catch(err => {
    console.error("❌ Fatal Error in main execution:");
    console.error(err);
    process.exit(1);
});