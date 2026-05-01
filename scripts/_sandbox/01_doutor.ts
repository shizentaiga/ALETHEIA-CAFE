// npx tsx scripts/_sandbox/01_doutor.ts

// https://shop.doutor.co.jp/doutor/spot/list?limit=50&address=01
// https://shop.doutor.co.jp/doutor/spot/list?limit=50&address=47

//  ドトールコーヒーショップ 沖縄イオン具志川店
// 沖縄県うるま市 字前原幸崎原 ３０３
// 098-983-6610
// 平日営業時間	10:00-22:00
// 土曜営業時間	10:00-22:00
// 日祝営業時間	10:00-22:00

/**
 * [File Path] scripts/01_doutor.ts
 * [Usage] npx tsx scripts/01_doutor.ts
 */
import { chromium, devices } from 'playwright';

async function scrapeDoutor() {
  console.log('🚀 Starting Doutor Scraper (Widget Scan Mode)...');
  
  const browser = await chromium.launch({ 
    headless: true, // 取得できるまで目視確認のためfalse推奨
    args: ['--disable-blink-features=AutomationControlled'] 
  });
  
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    locale: 'ja-JP',
  });

  const page = await context.newPage();

  try {
    // const url = 'https://shop.doutor.co.jp/doutor/spot/list?limit=50&address=47';
    const url = 'https://shop.doutor.co.jp/doutor/spot/list?limit=100&address=13';
    console.log(`🌐 Navigating to: ${url}`);
    
    // ページ遷移（ネットワークが静かになるまで待機）
    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });

    // 判明したクラス名「.copper-list-items」が現れるまで待機
    console.log('⏳ Waiting for Widget items (.copper-list-items)...');
    const targetSelector = '.copper-list-items';
    await page.waitForSelector(targetSelector, { timeout: 3000 });

    const spotRows = await page.locator(targetSelector).all();
    console.log(`✅ Found ${spotRows.length} spots. Extracting top 3...`);

    for (let i = 0; i < 10; i++) {
      if (spotRows[i]) {
        // 店舗名などは dl > dt や dl > dd の中に構造化されている可能性が高いです
        const rawText = await spotRows[i].innerText();
        
        // テキストを改行で分割して、必要な行（店舗名、住所、電話等）を整理
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l !== '');

        console.log(`\n--- Result [${i + 1}] ---`);
        // そのまま出すと情報が多すぎる場合があるため、最初の数行を抽出
        lines.slice(0, 8).forEach(line => console.log(line));

        if (i < 2) {
          console.log('\n...Waiting 2 seconds for safety...');
          await new Promise(res => setTimeout(res, 2000));
        }
      }
    }
  } catch (error) {
    console.error('❌ Error during extraction:', error);
    // await page.screenshot({ path: 'widget_error.png' });
  } finally {
    await new Promise(res => setTimeout(res, 3000));
    await browser.close();
    console.log('\n🔒 Browser closed.');
  }
}

scrapeDoutor();