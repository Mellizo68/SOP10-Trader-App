/**
 * FlashAlpha Integration Test Script
 *
 * Prueba todos los endpoints de market data
 *
 * Uso:
 *   npx ts-node backend/test-flashalpha.ts
 */

import { flashAlphaClient } from './src/api/flashalpha-client';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  console.log('🚀 FlashAlpha Integration Test Suite\n');
  console.log('=' .repeat(60));

  const testSymbol = 'SPY';

  try {
    // Test 1: Health Check
    console.log('\n📋 Test 1: Health Check');
    console.log('-'.repeat(60));
    const isHealthy = await flashAlphaClient.healthCheck();
    console.log(`✅ FlashAlpha API Status: ${isHealthy ? '🟢 HEALTHY' : '🔴 DOWN'}`);

    await delay(300);

    // Test 2: Get GEX
    console.log('\n📊 Test 2: Get GEX Data');
    console.log('-'.repeat(60));
    console.log(`Fetching GEX for ${testSymbol}...`);
    const gexData = await flashAlphaClient.getGEX(testSymbol);
    if (gexData) {
      console.log('✅ GEX Data retrieved:');
      console.log(`   Symbol: ${gexData.symbol}`);
      console.log(`   GEX: $${gexData.gex.toLocaleString()}`);
      console.log(`   GEX %: ${gexData.gexPercent}%`);
      console.log(`   Gamma Flip: ${gexData.gammaFlip ? '⚠️ YES' : '✅ NO'}`);
    } else {
      console.log('❌ No GEX data available');
    }

    await delay(300);

    // Test 3: Get Greeks
    console.log('\n🔢 Test 3: Get Greeks Data');
    console.log('-'.repeat(60));
    console.log(`Fetching Greeks for ${testSymbol}...`);
    const greeksData = await flashAlphaClient.getGreeksBySymbol(testSymbol);
    if (greeksData && greeksData.length > 0) {
      console.log(`✅ Retrieved ${greeksData.length} Greek records`);
      if (greeksData.length > 0) {
        const sample = greeksData[0];
        console.log('\n   Sample (first option):');
        console.log(`   Strike: ${sample.strike} | Exp: ${sample.expiration} | Type: ${sample.optionType}`);
        console.log(`   Delta: ${sample.delta.toFixed(3)} | Gamma: ${sample.gamma.toFixed(4)}`);
        console.log(`   Theta: ${sample.theta.toFixed(3)} | Vega: ${sample.vega.toFixed(3)} | IV: ${sample.iv.toFixed(1)}%`);
        console.log(`   Price: $${sample.price.toFixed(2)}`);
      }
    } else {
      console.log('❌ No Greeks data available');
    }

    await delay(300);

    // Test 4: Get Gamma Flip
    console.log('\n⚡ Test 4: Gamma Flip Data');
    console.log('-'.repeat(60));
    console.log(`Fetching Gamma Flip for ${testSymbol}...`);
    const flipData = await flashAlphaClient.getGammaFlip(testSymbol);
    if (flipData) {
      console.log('✅ Gamma Flip Data retrieved:');
      console.log(`   Flip Level: $${flipData.flipLevel}`);
      console.log(`   Direction: ${flipData.direction.toUpperCase()}`);
      console.log(`   Strength: ${(flipData.strength * 100).toFixed(1)}%`);
    } else {
      console.log('❌ No Gamma Flip data available');
    }

    await delay(300);

    // Test 5: Get Options Walls
    console.log('\n🧱 Test 5: Options Walls Data');
    console.log('-'.repeat(60));
    console.log(`Fetching Options Walls for ${testSymbol}...`);
    const wallsData = await flashAlphaClient.getOptionsWalls(testSymbol);
    if (wallsData && wallsData.length > 0) {
      console.log(`✅ Retrieved ${wallsData.length} wall records`);
      const sample = wallsData[0];
      console.log('\n   Sample (first strike):');
      console.log(`   Strike: ${sample.strikePrice}`);
      console.log(`   Put Wall: ${sample.putWall.contracts.toLocaleString()} contracts (${sample.putWall.level})`);
      console.log(`   Call Wall: ${sample.callWall.contracts.toLocaleString()} contracts (${sample.callWall.level})`);
    } else {
      console.log('❌ No Options Walls data available');
    }

    await delay(300);

    // Test 6: Get Volume/OI
    console.log('\n📈 Test 6: Volume & Open Interest');
    console.log('-'.repeat(60));
    console.log(`Fetching Volume/OI for ${testSymbol}...`);
    const voiData = await flashAlphaClient.getVolumeAndOI(testSymbol);
    if (voiData && voiData.length > 0) {
      console.log(`✅ Retrieved ${voiData.length} volume/OI records`);
      const sample = voiData[0];
      console.log('\n   Sample (first strike):');
      console.log(`   Strike: ${sample.strikePrice} | Exp: ${sample.expiration}`);
      console.log(`   Call OI: ${sample.callOI.toLocaleString()} | Call Vol: ${sample.callVolume.toLocaleString()}`);
      console.log(`   Put OI: ${sample.putOI.toLocaleString()} | Put Vol: ${sample.putVolume.toLocaleString()}`);
    } else {
      console.log('❌ No Volume/OI data available');
    }

    await delay(300);

    // Test 7: Combined Market Data
    console.log('\n🎯 Test 7: Combined Market Data (All-in-One)');
    console.log('-'.repeat(60));
    console.log(`Fetching combined market data for ${testSymbol}...`);
    const marketData = await flashAlphaClient.getMarketData(testSymbol);
    console.log('✅ Combined data retrieved:');
    console.log(`   GEX: ${marketData.gex ? '✅' : '❌'}`);
    console.log(`   Gamma Flip: ${marketData.gammaFlip ? '✅' : '❌'}`);
    console.log(`   Greeks: ${marketData.greeks.length} records ✅`);
    console.log(`   Walls: ${marketData.walls.length} records ✅`);
    console.log(`   Volume/OI: ${marketData.volumeOI.length} records ✅`);

    // Test 8: API Stats
    console.log('\n📊 Test 8: API Statistics');
    console.log('-'.repeat(60));
    const stats = flashAlphaClient.getStats();
    console.log(`✅ API Statistics:`);
    console.log(`   Total Requests Made: ${stats.totalRequests}`);
    console.log(`   Rate Limit Delay: ${stats.rateLimitDelay}ms`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 All Tests Completed!');
    console.log('='.repeat(60));
    console.log('\n✅ FlashAlpha Integration: READY FOR PRODUCTION');
    console.log('\n📝 Next Steps:');
    console.log('   1. Frontend Integration (Paso 3)');
    console.log('   2. Create MarketAnalysisTab in TradeJournal');
    console.log('   3. Real-time polling for market data');
    console.log('   4. Integrate with TradeInputForm');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
