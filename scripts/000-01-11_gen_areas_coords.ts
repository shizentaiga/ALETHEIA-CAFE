// scripts/000-01-11_gen_areas_coords.ts
// 実行コマンド: npx tsx scripts/000-01-11_gen_areas_coords.ts

import * as fs from 'fs';
import path from 'path';

const INPUT_PATH = 'src/db/seed/00_master/01-10_areas_master.sql';
const OUTPUT_PATH = 'src/db/seed/00_master/01-11_areas_coords_lv1-2.sql';

/**
 * 座標定義マッピング
 */
const COORDS_MASTER: Record<string, { lat: number; lng: number }> = {
  // 全国
  '全国': { lat: 35.6894, lng: 139.6917 },

  // 大エリア (Level 1)
  '北海道': { lat: 43.0641, lng: 141.3469 },
  '東北': { lat: 38.2682, lng: 140.8694 },
  '関東': { lat: 35.6894, lng: 139.6917 },
  '中部': { lat: 35.1814, lng: 136.9064 },
  '近畿': { lat: 34.6937, lng: 135.5022 },
  '中国': { lat: 34.3852, lng: 132.4553 },
  '四国': { lat: 33.8416, lng: 132.7653 },
  '九州・沖縄': { lat: 33.5902, lng: 130.4017 },

  // 北海道バーチャルエリア (Level 2)
  '道央': { lat: 43.0641, lng: 141.3469 },
  '道南': { lat: 41.7687, lng: 140.7288 },
  '道北': { lat: 43.7706, lng: 142.3648 },
  '道東': { lat: 42.9239, lng: 143.1961 },

  // 47都道府県 (Level 2)
  '青森県': { lat: 40.8244, lng: 140.7400 },
  '岩手県': { lat: 39.7036, lng: 141.1526 },
  '宮城県': { lat: 38.2682, lng: 140.8694 },
  '秋田県': { lat: 39.7186, lng: 140.1024 },
  '山形県': { lat: 38.2554, lng: 140.3396 },
  '福島県': { lat: 37.7503, lng: 140.4675 },
  '茨城県': { lat: 36.3418, lng: 140.4468 },
  '栃木県': { lat: 36.5651, lng: 139.8836 },
  '群馬県': { lat: 36.3907, lng: 139.0604 },
  '埼玉県': { lat: 35.8570, lng: 139.6489 },
  '千葉県': { lat: 35.6046, lng: 140.1232 },
  '東京都': { lat: 35.6894, lng: 139.6917 },
  '神奈川県': { lat: 35.4477, lng: 139.6425 },
  '新潟県': { lat: 37.9022, lng: 139.0236 },
  '富山県': { lat: 36.6953, lng: 137.2113 },
  '石川県': { lat: 36.5947, lng: 136.6256 },
  '福井県': { lat: 36.0652, lng: 136.2216 },
  '山梨県': { lat: 35.6639, lng: 138.5683 },
  '長野県': { lat: 36.6513, lng: 138.1810 },
  '岐阜県': { lat: 35.3912, lng: 136.7223 },
  '静岡県': { lat: 34.9769, lng: 138.3831 },
  '愛知県': { lat: 35.1814, lng: 136.9064 },
  '三重県': { lat: 34.7303, lng: 136.5086 },
  '滋賀県': { lat: 35.0045, lng: 135.8686 },
  '京都府': { lat: 35.0212, lng: 135.7556 },
  '大阪府': { lat: 34.6937, lng: 135.5022 },
  '兵庫県': { lat: 34.6913, lng: 135.1830 },
  '奈良県': { lat: 34.6851, lng: 135.8327 },
  '和歌山県': { lat: 34.2260, lng: 135.1675 },
  '鳥取県': { lat: 35.5039, lng: 134.2383 },
  '島根県': { lat: 35.4723, lng: 133.0505 },
  '岡山県': { lat: 34.6618, lng: 133.9344 },
  '広島県': { lat: 34.3852, lng: 132.4553 },
  '山口県': { lat: 34.1785, lng: 131.4737 },
  '徳島県': { lat: 34.0703, lng: 134.5548 },
  '香川県': { lat: 34.3401, lng: 134.0434 },
  '愛媛県': { lat: 33.8416, lng: 132.7653 },
  '高知県': { lat: 33.5597, lng: 133.5311 },
  '福岡県': { lat: 33.5902, lng: 130.4017 },
  '佐賀県': { lat: 33.2635, lng: 130.3009 },
  '長崎県': { lat: 32.7501, lng: 129.8777 },
  '熊本県': { lat: 32.7898, lng: 130.7417 },
  '大分県': { lat: 33.2382, lng: 131.6126 },
  '宮崎県': { lat: 31.9111, lng: 131.4239 },
  '鹿児島県': { lat: 31.5602, lng: 130.5581 },
  '沖縄県': { lat: 26.2124, lng: 127.6809 },
};

const main = () => {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input file not found: ${INPUT_PATH}`);
    return;
  }

  const inputContent = fs.readFileSync(INPUT_PATH, 'utf-8');
  const lines = inputContent.split('\n');
  let outputSql = `-- ALETHEIA Areas Coords Data (L1 & L2)\n-- Generated: ${new Date().toLocaleString()}\n\n`;

  // 0. 全国(area_id='00')の追加
  const zenkoku = COORDS_MASTER['全国'];
  outputSql += `INSERT OR REPLACE INTO areas (area_id, name, area_level, lat, lng) VALUES ('00', '全国', 0, ${zenkoku.lat}, ${zenkoku.lng});\n`;

  // 1. INPUTからLevel 1と2を抽出して座標を付与
  lines.forEach(line => {
    // SQL文から情報を抽出 (REGEXを用いてarea_id, name, levelを取得)
    const match = line.match(/VALUES\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(\d+)/);
    
    if (match) {
      const [_, areaId, name, levelStr] = match;
      const level = parseInt(levelStr, 10);

      // Level 1 または Level 2 の場合のみ処理
      if (level === 1 || level === 2) {
        const coords = COORDS_MASTER[name];
        if (coords) {
          outputSql += `INSERT OR REPLACE INTO areas (area_id, name, area_level, lat, lng) VALUES ('${areaId}', '${name}', ${level}, ${coords.lat}, ${coords.lng});\n`;
        } else {
          console.warn(`⚠️ Coords not found for: ${name}`);
          // 座標がない場合も元の値を維持（または必要に応じてデフォルト値を設定）
          outputSql += `${line}\n`;
        }
      }
    }
  });

  // 保存処理
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, outputSql);

  console.log(`✅ Success! Output saved to: ${OUTPUT_PATH}`);
};

main();
