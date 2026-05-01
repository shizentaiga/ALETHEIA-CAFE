// npx tsx scripts/001_starbucks_fetch.ts

import fs from 'fs';
import path from 'path';
import { PATHS, CONFIG, sleep, ensureDirectory } from './utils';

interface StarbucksApiResponse {
    hits?: {
        found: number;
        hit: any[];
    };
}

async function fetchStarbucksData(prefCode: string, start = 0): Promise<StarbucksApiResponse | null> {
    const baseUrl = 'https://hn8madehag.execute-api.ap-northeast-1.amazonaws.com/prd-2019-08-21/storesearch';
    const numericPrefCode = parseInt(prefCode, 10);
    const params = new URLSearchParams({
        size: '100',
        'q.parser': 'structured',
        q: `(and record_type:1 pref_code:${numericPrefCode})`,
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

async function main() {
    console.log("🚀 Starting Starbucks Data Fetch (Raw Mode)...");
    const prefList = Array.from({ length: 47 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    let allHits: any[] = [];

    for (let i = 0; i < prefList.length; i += CONFIG.CONCURRENCY) {
        const chunk = prefList.slice(i, i + CONFIG.CONCURRENCY);
        console.log(`📦 Processing Chunk: ${chunk.join(', ')}...`);

        const results = await Promise.all(chunk.map(async (pref) => {
            let start = 0;
            let hitsInPref = [];
            let hasMore = true;

            while (hasMore) {
                const data = await fetchStarbucksData(pref, start);
                if (!data || !data.hits) break;
                const hits = data.hits.hit || [];
                hitsInPref.push(...hits);
                console.log(`  📍 Pref:${pref} - Found: ${hits.length} (Total: ${data.hits.found})`);

                start += 100;
                if (start >= data.hits.found) {
                    hasMore = false;
                } else {
                    await sleep(CONFIG.WAIT_SHORT);
                }
            }
            return hitsInPref;
        }));

        allHits.push(...results.flat().filter(Boolean));
        await sleep(CONFIG.WAIT_LONG);
    }

    ensureDirectory(PATHS.RAW_DATA);
    const savePath = path.join(PATHS.RAW_DATA, '001_starbucks.json');
    fs.writeFileSync(savePath, JSON.stringify(allHits, null, 2));
    console.log(`\n✨ Raw data saved to: ${savePath}`);
}

main();