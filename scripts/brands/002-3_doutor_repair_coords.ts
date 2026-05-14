/**
 * Doutor SQL Repair Script (Google Maps Edition)
 * 
 * SQL内の緯度経度 NULL を Google Maps Geocoding API で補完します。
 * .dev.vars から GOOGLE_MAPS_API_KEY を読み込みます。
 * 
 * Usage: npx tsx scripts/002-3_doutor_repair_coords.ts
 * 
 * ⭐️doutor2.sqlが出力(最後にdoutor.sqlを削除して、doutor.sqlにリネームすること)
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const MAX_REPAIRS = 3000; 
const INPUT_FILE = 'src/db/seed/chains/doutor.sql';
const OUTPUT_FILE = 'src/db/seed/chains/doutor2.sql';
const SLEEP_MS = 100; // Googleはスロットルに余裕があるため少し短縮

const envPath = path.resolve(process.cwd(), '.dev.vars');
const env = dotenv.parse(fs.readFileSync(envPath));
const API_KEY = env.GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.error('GOOGLE_MAPS_API_KEY is not defined in .dev.vars');
  process.exit(1);
}

/**
 * 住所の正規化
 * Google APIは空白があっても問題なく解釈しますが、
 * 念のため余計な改行や連続した空白のみ整理します。
 */
function normalizeAddress(address: string): string {
  return address.trim().replace(/\s+/g, ' ');
}

/**
 * Google Maps Geocoding API 呼び出し
 */
async function fetchCoordinates(address: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}&language=ja`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data: any = await res.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { 
        lat: location.lat, 
        lng: location.lng // 内部的に lat, lon で返すように統一
      } as any;
    }

    // ZERO_RESULTS 等の場合は null を返す
    return null;
  } catch (e) {
    console.error(`      ⚠️ API Error: ${e}`);
  }
  return null;
}

async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    return;
  }

  const sqlContent = fs.readFileSync(INPUT_FILE, 'utf-8');
  const lines = sqlContent.split('\n');
  const repairedLines: string[] = [];
  let repairCount = 0;
  let failCount = 0;

  console.log(`🚀 Starting repair with Google Maps API... (Max: ${MAX_REPAIRS})`);
  console.log(`(Only failures will be displayed)\n`);

  for (let line of lines) {
    // 緯度経度が NULL, NULL の行を特定
    if (line.includes('VALUES') && line.includes('NULL, NULL')) {
      
      if (repairCount < MAX_REPAIRS) {
        const idMatch = line.match(/'(DTR_[^']+)'/);
        const addrMatch = line.match(/, '([^']+)', NULL, NULL/);

        if (idMatch && addrMatch) {
          const serviceId = idMatch[1];
          const rawAddress = addrMatch[1];
          const targetAddress = normalizeAddress(rawAddress);

          // Google API 呼び出し
          const coords: any = await fetchCoordinates(targetAddress);

          if (coords) {
            // Google API は {lat, lng} で返ってくるので注意
            line = line.replace('NULL, NULL', `${coords.lat}, ${coords.lng}`);
            repairCount++;
            process.stdout.write('.'); 
          } else {
            failCount++;
            console.log(`\n❌ [NG] ${serviceId}`);
            console.log(`   Address: ${rawAddress}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, SLEEP_MS));
        }
      }
    }
    repairedLines.push(line);
  }

  fs.writeFileSync(OUTPUT_FILE, repairedLines.join('\n'));
  console.log(`\n\n✨ Repair Session Completed.`);
  console.log(`✅ Fixed: ${repairCount} rows`);
  console.log(`❌ Failed: ${failCount} rows`);
  console.log(`💾 Saved to: ${OUTPUT_FILE}`);
}

main().catch(console.error);