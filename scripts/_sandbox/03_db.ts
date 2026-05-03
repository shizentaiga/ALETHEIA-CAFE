/**
 * [File Path] scripts/_sandbox/03_db.ts
 * [Usage] npx tsx scripts/_sandbox/03_db.ts
 */

import { Miniflare } from "miniflare";

async function main() {
  const mf = new Miniflare({
    d1Databases: { 
      // キー（左側）はプログラム内で使う名前、
      // 値（右側）は wrangler.toml の database_id を記述
      ALETHEIA_CAFE_DB: "70ed05d4-20d7-484d-bdc1-3a5e9ea63086" 
    },
    modules: true,
    script: `export default { fetch: () => new Response("ok") }`,
    // ローカルの既存データを使用する場合、データの保存場所を指定
    d1Persist: ".wrangler/state/v3/d1", 
  });

  // ここでキー名を指定して取得
  const db = await mf.getD1Database("ALETHEIA_CAFE_DB");

  const result = await db.prepare("SELECT COUNT(*) as count FROM areas").first();
  console.log("Total areas:", result?.count);

  await mf.dispose();
}

main();