// npx tsx scripts/_sandbox/scrape-test.ts

/**
 * [Usage] npx tsx scripts/scrape-test.ts
 * [Role] Pure Node.js script to test Playwright logic independently.
 */
import { chromium } from 'playwright';

async function runScrape() {
  console.log('🚀 Starting browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('🌐 Navigating to Books to Scrape...');
    await page.goto('https://books.toscrape.com/');

    // Select book titles
    const bookElements = await page.locator('h3 a').all();
    console.log(`✅ Found ${bookElements.length} items. Fetching top 3...`);

    for (let i = 0; i < 3; i++) {
      if (bookElements[i]) {
        const title = await bookElements[i].innerText();
        console.log(`   [${i + 1}] ${title}`);

        // Human-like delay
        if (i < 2) await new Promise(res => setTimeout(res, 1000));
      }
    }
  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await browser.close();
    console.log('🔒 Browser closed.');
  }
}

runScrape();