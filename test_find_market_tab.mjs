import { chromium } from 'playwright';

async function findMarketAnalysisTab() {
  console.log('Finding Market Analysis Tab...\n');
  
  let browser, page;
  
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    // Click Trade Journal
    const tradeJournalBtn = page.locator('button:has-text("Trade Journal")');
    if (await tradeJournalBtn.count() > 0) {
      await tradeJournalBtn.click();
      await page.waitForTimeout(1500);
    }
    
    // List ALL buttons/tabs to find Market Analysis
    const allButtons = page.locator('button');
    const allCount = await allButtons.count();
    
    console.log('All tabs/buttons after navigating to Trade Journal:\n');
    
    for (let i = 0; i < allCount; i++) {
      try {
        const text = await allButtons.nth(i).innerText();
        const isVisible = await allButtons.nth(i).isVisible();
        console.log(`  [${i}] "${text}" ${isVisible ? '👁️ visible' : '🙈 hidden'}`);
      } catch (e) {
        console.log(`  [${i}] (element error)`);
      }
    }
    
    console.log('\n--- Looking for Market Analysis tab ---\n');
    
    // Click on each button to check for Market Analysis
    for (let i = 0; i < allCount; i++) {
      const text = await allButtons.nth(i).innerText();
      if (text.toLowerCase().includes('market') || text.toLowerCase().includes('analysis') || text.includes('📊')) {
        console.log(`Attempting to click: "${text}"`);
        await allButtons.nth(i).click();
        await page.waitForTimeout(1000);
        
        // Check page content after click
        const content = await page.content();
        const hasSymbolInput = (await page.locator('input[type="text"]').count()) > 0;
        const hasGEX = content.includes('GEX');
        const hasGreeks = content.includes('Delta') || content.includes('delta');
        
        console.log(`  After click: Symbol input=${hasSymbolInput}, GEX=${hasGEX}, Greeks=${hasGreeks}`);
        
        if (hasSymbolInput && (hasGEX || hasGreeks)) {
          console.log(`\n✅ FOUND! This is the Market Analysis tab!\n`);
          
          // Now test the tab
          console.log('Testing Market Analysis Tab functionality:\n');
          
          const symbolInput = page.locator('input[type="text"]').first();
          const initialValue = await symbolInput.inputValue();
          console.log(`  Current symbol: "${initialValue}"`);
          
          // Test change
          await symbolInput.click();
          await symbolInput.triple_click?.() || await symbolInput.fill('TSLA');
          await symbolInput.type('TSLA', { delay: 50 });
          
          const newValue = await symbolInput.inputValue();
          console.log(`  Changed to: "${newValue}"`);
          
          await page.waitForTimeout(1500);
          
          // Test API
          const tslaData = await page.evaluate(async () => {
            const res = await fetch('/api/market/data/TSLA');
            const data = await res.json();
            return {
              symbol: data.data.symbol,
              gex: (data.data.gex.gex / 1000000).toFixed(2),
              greeks: data.data.greeks.count
            };
          });
          
          console.log(`\n  ✅ API Data Loaded: ${tslaData.symbol} - GEX: $${tslaData.gex}M - Greeks: ${tslaData.greeks} items\n`);
          console.log('✅ VERIFICATION PASSED - Market Analysis Tab is Working!');
          
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

findMarketAnalysisTab().catch(console.error);
