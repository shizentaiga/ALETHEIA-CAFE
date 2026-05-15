import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

/**
 * 実行コマンド: npx tsx scripts/000_gen_stations.ts
 */

const INPUT_DIR = 'scripts/data/ekidata';
const OUTPUT_DIR = 'src/db/seed/00_master';

const TARGETS = [
  {
    csv: 'company20260409.csv',
    sql: '02-10_companies.sql',
    table: 'companies'
  },
  {
    csv: 'line20260409free.csv',
    sql: '02-20_lines.sql',
    table: 'lines'
  },
  {
    csv: 'station20260430free.csv',
    sql: '02-30_stations_base.sql',
    table: 'stations'
  }
];

/**
 * 住所のクリーニング（最小限）
 * src/lib/searchUtils.ts の実装をそのまま移植
 */
export function cleanDisplayAddress(str: string) {
  if (!str) return '';
  // NFKC正規化で全角数字・全角スペース・全角ハイフンを一括で半角に変換
  // その後、タブや改行を除去
  return str.normalize('NFKC')
            // VSCodeが警告を出す特定のハイフン（U+2010等）を半角マイナスに変換
            // .replace(/[‐－ー—]/g, '-') 
            .replace(/\t/g, ' ')
            .replace(/\r?\n/g, ' ')
            .trim();
}

/**
 * 文字列をSQLセーフな形式に変換
 */
const escapeSql = (val: string | undefined): string => {
  if (val === undefined || val === '' || val === '0000-00-00') return 'NULL';
  
  // 指定された関数でクリーニング
  const cleaned = cleanDisplayAddress(val);
  
  // シングルクォートのエスケープ
  const escaped = cleaned.replace(/'/g, "''");
  return `'${escaped}'`;
};

/**
 * 数値をSQLセーフな形式に変換
 */
const formatNum = (val: string | undefined): string => {
  if (val === undefined || val === '') return 'NULL';
  return val;
};

async function main() {
  console.log('🚀 Starting station data generation (Logic: cleanDisplayAddress)...');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  for (const target of TARGETS) {
    const csvPath = path.join(INPUT_DIR, target.csv);
    if (!fs.existsSync(csvPath)) {
      console.warn(`⚠️ Skip: ${target.csv} not found.`);
      continue;
    }

    console.log(`📖 Processing ${target.csv}...`);

    const utf8Content = fs.readFileSync(csvPath, 'utf8');

    const records = parse(utf8Content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, string>[];

    const sqlLines: string[] = [];
    sqlLines.push(`-- Generated from ${target.csv}`);
    sqlLines.push(`DELETE FROM ${target.table};`);

    for (const record of records) {
      let values = '';

      if (target.table === 'companies') {
        values = [
          formatNum(record.company_cd),
          formatNum(record.rr_cd),
          escapeSql(record.company_name),
          escapeSql(record.company_name_k),
          escapeSql(record.company_name_h),
          escapeSql(record.company_name_r),
          escapeSql(record.company_url),
          formatNum(record.company_type),
          formatNum(record.e_status),
          formatNum(record.e_sort)
        ].join(', ');
      } 
      else if (target.table === 'lines') {
        values = [
          formatNum(record.line_cd),
          formatNum(record.company_cd),
          escapeSql(record.line_name),
          escapeSql(record.line_name_k),
          escapeSql(record.line_name_h),
          escapeSql(record.line_color_c),
          escapeSql(record.line_color_t),
          formatNum(record.line_type),
          formatNum(record.lon),
          formatNum(record.lat),
          formatNum(record.zoom),
          formatNum(record.e_status),
          formatNum(record.e_sort)
        ].join(', ');
      } 
      else if (target.table === 'stations') {
        values = [
          formatNum(record.station_cd),
          formatNum(record.station_g_cd),
          escapeSql(record.station_name),
          escapeSql(record.station_name_k),
          escapeSql(record.station_name_r),
          formatNum(record.line_cd),
          formatNum(record.pref_cd),
          escapeSql(record.post),
          escapeSql(record.address),
          formatNum(record.lon),
          formatNum(record.lat),
          escapeSql(record.open_ymd),
          escapeSql(record.close_ymd),
          formatNum(record.e_status),
          formatNum(record.e_sort)
        ].join(', ');
      }

      sqlLines.push(`INSERT INTO ${target.table} VALUES (${values});`);
    }

    const outputPath = path.join(OUTPUT_DIR, target.sql);
    fs.writeFileSync(outputPath, sqlLines.join('\n'), 'utf8');
    console.log(`✅ Saved: ${target.sql} (${records.length} records)`);
  }

  console.log('✨ All tasks completed.');
}

main().catch(console.error);