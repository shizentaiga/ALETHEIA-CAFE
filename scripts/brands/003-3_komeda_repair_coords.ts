/**
 * Komeda SQL Repair Script (Google Maps Edition)
 * 
 * SQL内の緯度経度 NULL を Google Maps Geocoding API で補完します。
 * .dev.vars から GOOGLE_MAPS_API_KEY を読み込みます。
 * 
 * Usage: npx tsx scripts/003-3_komeda_repair_coords.ts
 * 
 * ⭐️komeda2.sqlが出力(最後にkomeda.sqlを削除して、komeda.sqlにリネームすること)
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const MAX_REPAIRS = 3000;   // 最大の修正数
const INPUT_FILE = 'src/db/seed/brands/003-1_komeda.sql';
const OUTPUT_FILE = 'src/db/seed/brands/003-2_komeda.sql';
const SLEEP_MS = 100; 

const envPath = path.resolve(process.cwd(), '.dev.vars');
const env = dotenv.parse(fs.readFileSync(envPath));
const API_KEY = env.GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
  console.error('GOOGLE_MAPS_API_KEY is not defined in .dev.vars');
  process.exit(1);
}

function normalizeAddress(address: string): string {
  return address.trim().replace(/\s+/g, ' ');
}

async function fetchCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}&language=ja`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const data: any = await res.json();
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { 
        lat: location.lat, 
        lng: location.lng
      };
    }
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
  let totalProcessed = 0; // 進捗計算用

  console.log(`🚀 Starting repair with Google Maps API... (Max: ${MAX_REPAIRS})`);
  console.log(`(Only failures will be displayed. Progress shown every 50 repairs)\n`);

  for (let line of lines) {
    if (line.includes('VALUES') && line.includes('NULL, NULL')) {
      
      if (repairCount < MAX_REPAIRS) {
        // service_id のマッチングを DTR_ 以外にも対応できるよう汎用化
        const idMatch = line.match(/'([^']+)'/); 
        const addrMatch = line.match(/, '([^']+)', NULL, NULL/);

        if (idMatch && addrMatch) {
          const serviceId = idMatch[1];
          const rawAddress = addrMatch[1];
          const targetAddress = normalizeAddress(rawAddress);

          const coords = await fetchCoordinates(targetAddress);

          if (coords) {
            line = line.replace('NULL, NULL', `${coords.lat}, ${coords.lng}`);
            repairCount++;
            process.stdout.write('.'); 
          } else {
            failCount++;
            console.log(`\n❌ [NG] ${serviceId} | Address: ${rawAddress}`);
          }

          // 進捗表示のロジック
          totalProcessed++;
          if (totalProcessed % 50 === 0) {
            console.log(`\n📦 Progress: ${repairCount} rows fixed...`);
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