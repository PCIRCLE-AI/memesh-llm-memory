#!/usr/bin/env node
/**
 * Startup Performance Test
 *
 * Measures MCP server cold start time
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '../dist/mcp/server-bootstrap.js');

async function testStartup(runNumber) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    let firstResponseTime = null;

    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    server.stdout.once('data', () => {
      firstResponseTime = performance.now() - startTime;
      server.kill();
      resolve({ firstResponseTime });
    });

    server.stderr.on('data', (data) => {
      // Ignore stderr for this test
    });

    // Send initialize request immediately
    server.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'startup-test', version: '1.0.0' }
      }
    }) + '\n');

    // Timeout
    setTimeout(() => {
      server.kill();
      resolve({ timeout: true });
    }, 5000);
  });
}

async function runTests() {
  try {
    console.log('🚀 MCP Server Startup Performance Test\n');

    const results = [];

    for (let i = 1; i <= 5; i++) {
      console.log(`Run ${i}:`, 'Starting...');
      const result = await testStartup(i);

      if (result.timeout) {
        console.log(`       ❌ TIMEOUT`);
      } else {
        console.log(`       ✅ ${result.firstResponseTime.toFixed(2)}ms`);
        results.push(result.firstResponseTime);
      }

      // Wait a bit between runs
      await new Promise(r => setTimeout(r, 200));
    }

    if (results.length > 0) {
      const avg = results.reduce((a, b) => a + b, 0) / results.length;
      const min = Math.min(...results);
      const max = Math.max(...results);

      console.log('\n' + '='.repeat(50));
      console.log('📊 Summary (5 cold starts)');
      console.log('='.repeat(50));
      console.log(`Average:  ${avg.toFixed(2)}ms`);
      console.log(`Min:      ${min.toFixed(2)}ms`);
      console.log(`Max:      ${max.toFixed(2)}ms`);

      console.log('\n' + '='.repeat(50));

      if (avg > 2000) {
        console.log('❌ SLOW: Average startup > 2 seconds');
        console.log('   Database initialization or resource loading issue');
      } else if (avg > 500) {
        console.log('⚠️  WARNING: Average startup > 500ms');
        console.log('   Could be optimized');
      } else {
        console.log('✅ FAST: Average startup < 500ms');
        console.log('   Startup performance is good!');
      }
    }
  } catch (error) {
    console.error('💥 Error in runTests:', error);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('💥 Error:', err);
  process.exit(1);
});
