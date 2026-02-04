#!/usr/bin/env node
/**
 * Startup Performance Test
 *
 * Measures MCP server cold start time with robust process management
 * to prevent race conditions and process leaks.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverPath = join(__dirname, '../dist/mcp/server-bootstrap.js');

// Verify server exists before running tests
if (!existsSync(serverPath)) {
  console.error(`❌ Server not found at: ${serverPath}`);
  console.error('   Run "npm run build" first');
  process.exit(1);
}

async function testStartup(runNumber) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    let firstResponseTime = null;
    let isResolved = false;
    let processExited = false;
    let killTimer = null;

    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    /**
     * Cleanup: Ensure process is terminated
     */
    const cleanup = (reason) => {
      if (killTimer) clearTimeout(killTimer);

      if (!processExited && !server.killed) {
        // Try graceful SIGTERM first
        server.kill('SIGTERM');

        // Force kill after 1 second if still alive
        killTimer = setTimeout(() => {
          if (!processExited) {
            console.warn(`  ⚠️  Force killing process (${reason})`);
            server.kill('SIGKILL');
          }
        }, 1000);
      }
    };

    /**
     * Resolve once (prevents race condition)
     */
    const resolveOnce = (result) => {
      if (!isResolved) {
        isResolved = true;
        cleanup('test complete');
        resolve(result);
      }
    };

    /**
     * Reject once (prevents race condition)
     */
    const rejectOnce = (error) => {
      if (!isResolved) {
        isResolved = true;
        cleanup('error');
        reject(error);
      }
    };

    // Track process exit
    server.on('exit', (code, signal) => {
      processExited = true;
      if (killTimer) clearTimeout(killTimer);

      if (!isResolved && code !== 0 && code !== null) {
        rejectOnce(new Error(`Server exited with code ${code}`));
      }
    });

    // Success: first stdout data
    server.stdout.once('data', () => {
      if (!isResolved) {
        firstResponseTime = performance.now() - startTime;
        resolveOnce({
          run: runNumber,
          startupTime: firstResponseTime.toFixed(2),
        });
      }
    });

    // Log stderr but don't fail on it (some warnings are ok)
    server.stderr.on('data', (data) => {
      const message = data.toString().trim();
      if (message && !isResolved) {
        console.warn(`  ⚠️  stderr: ${message}`);
      }
    });

    // Process error (spawn failed, etc)
    server.on('error', (error) => {
      rejectOnce(new Error(`Failed to spawn server: ${error.message}`));
    });

    // Send initialize request
    try {
      const initRequest = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'startup-test',
            version: '1.0.0',
          },
        },
      }) + '\n';

      server.stdin.write(initRequest, (error) => {
        if (error && !isResolved) {
          rejectOnce(new Error(`Failed to send initialize: ${error.message}`));
        }
      });
    } catch (error) {
      rejectOnce(new Error(`Failed to write to stdin: ${error.message}`));
    }

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!isResolved) {
        resolveOnce({
          run: runNumber,
          startupTime: 'timeout',
          timedOut: true,
        });
      }
    }, 5000);
  });
}

async function runTests() {
  try {
    console.log('\n🚀 Testing MCP Server Startup Performance');
    console.log('━'.repeat(60));

    const runs = 5;
    const results = [];

    for (let i = 0; i < runs; i++) {
      console.log(`\nRun ${i + 1}/${runs}...`);
      try {
        const result = await testStartup(i + 1);
        results.push(result);

        if (result.timedOut) {
          console.log(`  ⏱️  Run ${result.run}: TIMEOUT (> 5s)`);
        } else {
          console.log(`  ✓ Run ${result.run}: ${result.startupTime}ms`);
        }
      } catch (error) {
        console.error(`  ❌ Run ${i + 1} failed:`, error.message);
        results.push({
          run: i + 1,
          error: error.message,
        });
      }

      // Wait between runs to avoid resource conflicts
      if (i < runs - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate statistics
    console.log('\n📊 Results:');
    console.log('━'.repeat(60));

    const successfulRuns = results.filter(r => !r.timedOut && !r.error && r.startupTime);
    if (successfulRuns.length > 0) {
      const times = successfulRuns.map(r => parseFloat(r.startupTime));
      const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
      const min = Math.min(...times).toFixed(2);
      const max = Math.max(...times).toFixed(2);

      console.log(`Average: ${avg}ms`);
      console.log(`Min: ${min}ms`);
      console.log(`Max: ${max}ms`);
      console.log(`Success rate: ${successfulRuns.length}/${runs}`);
    } else {
      console.log('❌ No successful runs');
    }

    console.log('');
  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests with top-level error handler
runTests().catch(err => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
