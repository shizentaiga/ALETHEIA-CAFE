// scripts/000_gen_stations.ts
// 実行コマンド: npx tsx scripts/000_gen_stations.ts

// 出力先：src/db/seed/00_master/companies.sql 
// 出力先：src/db/seed/00_master/lines.sql 
// 出力先：src/db/seed/00_master/stations.sql 

import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';
import { parse } from 'csv-parse/sync';

/**
 * 実行コマンド: npx tsx scripts/000_gen_stations.ts
 */

const INPUT_DIR = 'scripts/data/ekidata';
const OUTPUT_DIR = 'src/db/seed/00_master';

// 対象ファイル定義
const TARGETS = [
  {
    csv: 'company20260409.csv',
    sql: 'companies.sql',
    table: 'companies'
  },
  {
    csv: 'line20260409free.csv',
    sql: 'lines.sql',
    table: 'lines'
  },
  {
    csv: 'station20260430free.csv',
    sql: 'stations.sql',
    table: 'stations'
  }
];

/**
 * 文字列をSQLセーフな形式に変換
 */
const escapeSql = (val: string | undefined): string => {
  if (val === undefined || val === '' || val === '0000-00-00') return 'NULL';
  const escaped = val.replace(/'/g, "''");
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
  console.log('🚀 Starting station data generation for D1...');

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

    const buffer = fs.readFileSync(csvPath);
    const utf8Content = iconv.decode(buffer, 'Shift_JIS');

    // record の型を Record<string, string> としてパース
    const records = parse(utf8Content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, string>[];

    const sqlLines: string[] = [];
    sqlLines.push(`-- Generated from ${target.csv}`);
    sqlLines.push(`DELETE FROM ${target.table};`);

    // D1のエラー回避のため BEGIN/COMMIT は含めず、各INSERT文のみを生成
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