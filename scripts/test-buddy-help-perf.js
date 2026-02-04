#!/usr/bin/env node
/**
 * Buddy Help Performance Test
 *
 * Tests buddy-help function performance in isolation
 */

import { performance } from 'perf_hooks';

async function testBuddyHelp() {
  try {
    console.log('🔍 Testing buddy-help performance...\n');

    // Import the modules
    const { BuddyCommands } = await import('../dist/mcp/BuddyCommands.js');
    const { ResponseFormatter } = await import('../dist/ui/ResponseFormatter.js');
    const { executeBuddyHelp } = await import('../dist/mcp/tools/buddy-help.js');

    const formatter = new ResponseFormatter();

    // Test 1: BuddyCommands.getHelp() - General help
    console.log('Test 1: BuddyCommands.getHelp() - General');
    const start1 = performance.now();
    const generalHelp = BuddyCommands.getHelp();
    const end1 = performance.now();
    console.log(`  Time: ${(end1 - start1).toFixed(2)}ms`);
    console.log(`  Length: ${generalHelp.length} chars\n`);

    // Test 2: BuddyCommands.getHelp('do') - Specific command
    console.log('Test 2: BuddyCommands.getHelp("do")');
    const start2 = performance.now();
    const doHelp = BuddyCommands.getHelp('do');
    const end2 = performance.now();
    console.log(`  Time: ${(end2 - start2).toFixed(2)}ms`);
    console.log(`  Length: ${doHelp.length} chars\n`);

    // Test 3: executeBuddyHelp() - Full flow without args
    console.log('Test 3: executeBuddyHelp({}) - Full flow');
    const start3 = performance.now();
    const result1 = await executeBuddyHelp({}, formatter);
    const end3 = performance.now();
    console.log(`  Time: ${(end3 - start3).toFixed(2)}ms`);
    console.log(`  Output length: ${result1.content[0].text.length} chars\n`);

    // Test 4: executeBuddyHelp() - Full flow with command
    console.log('Test 4: executeBuddyHelp({command: "do"}) - Full flow');
    const start4 = performance.now();
    const result2 = await executeBuddyHelp({ command: 'do' }, formatter);
    const end4 = performance.now();
    console.log(`  Time: ${(end4 - start4).toFixed(2)}ms`);
    console.log(`  Output length: ${result2.content[0].text.length} chars\n`);

    // Summary
    console.log('=' .repeat(50));
    console.log('📊 Summary:');
    console.log('=' .repeat(50));
    console.log(`BuddyCommands.getHelp():        ${(end1 - start1).toFixed(2)}ms`);
    console.log(`BuddyCommands.getHelp('do'):    ${(end2 - start2).toFixed(2)}ms`);
    console.log(`executeBuddyHelp({}):           ${(end3 - start3).toFixed(2)}ms`);
    console.log(`executeBuddyHelp({command}):    ${(end4 - start4).toFixed(2)}ms`);

    const maxTime = Math.max(end1 - start1, end2 - start2, end3 - start3, end4 - start4);

    if (maxTime > 1000) {
      console.log('\n❌ SLOW: Some operations took > 1 second');
      process.exit(1);
    } else if (maxTime > 100) {
      console.log('\n⚠️  WARNING: Some operations took > 100ms');
    } else {
      console.log('\n✅ All operations are fast (< 100ms)');
    }
  } catch (error) {
    console.error('💥 Error in testBuddyHelp:', error);
    process.exit(1);
  }
}

testBuddyHelp().catch(err => {
  console.error('💥 Test error:', err);
  process.exit(1);
});
