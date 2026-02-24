#!/usr/bin/env node

/**
 * Hook Test Harness — Simulates Claude Code hook execution.
 *
 * Pipes mock stdin JSON to a hook script and validates the output.
 * Does NOT require Claude Code runtime.
 *
 * Usage:
 *   node hook-test-harness.js <hook-script> <mock-stdin-json>
 *   node hook-test-harness.js ../pre-tool-use.js '{"tool_name":"Bash","tool_input":{"command":"git commit -m test"}}'
 *
 * Or programmatically:
 *   import { runHook, assertJSON, assertContains } from './hook-test-harness.js';
 */

import { execFile } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Core Test Functions
// ============================================================================

/**
 * Run a hook script with mock stdin and capture output.
 *
 * @param {string} hookPath - Path to hook script (relative to hooks/ dir or absolute)
 * @param {Object|string} stdinData - JSON data to pipe as stdin
 * @param {Object} options - Options
 * @param {number} options.timeout - Timeout in ms (default: 10000)
 * @param {Object} options.env - Additional environment variables
 * @returns {Promise<{ stdout: string, stderr: string, exitCode: number, parsed: Object|null }>}
 */
export function runHook(hookPath, stdinData, options = {}) {
  const { timeout = 10000, env = {} } = options;

  // Resolve hook path relative to hooks directory
  const resolvedPath = path.isAbsolute(hookPath)
    ? hookPath
    : path.resolve(__dirname, '..', hookPath);

  const stdinStr = typeof stdinData === 'string'
    ? stdinData
    : JSON.stringify(stdinData);

  return new Promise((resolve) => {
    const child = execFile('node', [resolvedPath], {
      encoding: 'utf-8',
      timeout,
      env: { ...process.env, ...env },
    }, (error, stdout, stderr) => {
      let parsed = null;
      try {
        if (stdout.trim()) {
          parsed = JSON.parse(stdout.trim());
        }
      } catch {
        // Not JSON output — that's fine for some hooks
      }

      resolve({
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: error ? (error.code || 1) : 0,
        parsed,
      });
    });

    // Pipe stdin
    if (child.stdin) {
      child.stdin.write(stdinStr);
      child.stdin.end();
    }
  });
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that the hook output is valid JSON with expected structure.
 * @param {Object} result - Result from runHook()
 * @param {string} hookEventName - Expected hookEventName
 * @returns {boolean}
 */
export function assertHookResponse(result, hookEventName) {
  if (!result.parsed) {
    console.error(`  FAIL: No JSON output`);
    return false;
  }

  const output = result.parsed.hookSpecificOutput;
  if (!output) {
    console.error(`  FAIL: Missing hookSpecificOutput`);
    return false;
  }

  if (output.hookEventName !== hookEventName) {
    console.error(`  FAIL: hookEventName is "${output.hookEventName}", expected "${hookEventName}"`);
    return false;
  }

  return true;
}

/**
 * Assert that stdout contains a substring.
 * @param {Object} result - Result from runHook()
 * @param {string} substring - Expected substring
 * @returns {boolean}
 */
export function assertContains(result, substring) {
  const fullOutput = result.stdout + result.stderr;
  if (!fullOutput.includes(substring)) {
    console.error(`  FAIL: Output does not contain "${substring}"`);
    return false;
  }
  return true;
}

/**
 * Assert hook exited silently (no stdout, exit 0).
 * @param {Object} result - Result from runHook()
 * @returns {boolean}
 */
export function assertSilent(result) {
  if (result.stdout.trim() !== '') {
    console.error(`  FAIL: Expected silent exit, got stdout: ${result.stdout.substring(0, 100)}`);
    return false;
  }
  return true;
}

// ============================================================================
// Test Runner
// ============================================================================

/**
 * Simple test runner for hook tests.
 * @param {string} suiteName - Test suite name
 * @param {Array<{name: string, fn: Function}>} tests - Test cases
 */
export async function runTests(suiteName, tests) {
  console.log(`\n  ${suiteName}`);
  console.log('  ' + '─'.repeat(50));

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result !== false) {
        console.log(`  ✅ ${test.name}`);
        passed++;
      } else {
        console.log(`  ❌ ${test.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ ${test.name}`);
      console.error(`     Error: ${error.message}`);
      failed++;
    }
  }

  console.log('  ' + '─'.repeat(50));
  console.log(`  Results: ${passed} passed, ${failed} failed\n`);

  return { passed, failed };
}

// ============================================================================
// CLI Mode
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node hook-test-harness.js <hook-script> <mock-stdin-json>');
    console.log('');
    console.log('Examples:');
    console.log('  node hook-test-harness.js pre-tool-use.js \'{"tool_name":"Bash","tool_input":{"command":"git commit -m test"}}\'');
    console.log('  node hook-test-harness.js post-tool-use.js \'{"tool_name":"Read","tool_input":{"file_path":"/tmp/test.js"}}\'');
    process.exit(0);
  }

  const [hookScript, stdinJSON] = args;

  console.log(`\nRunning: ${hookScript}`);
  console.log(`Stdin: ${stdinJSON.substring(0, 100)}...`);
  console.log('');

  const result = await runHook(hookScript, stdinJSON);

  console.log(`Exit code: ${result.exitCode}`);
  if (result.stdout.trim()) {
    console.log(`Stdout: ${result.stdout.trim()}`);
  }
  if (result.stderr.trim()) {
    console.log(`Stderr: ${result.stderr.trim()}`);
  }
  if (result.parsed) {
    console.log(`Parsed JSON:`);
    console.log(JSON.stringify(result.parsed, null, 2));
  }
}

// Run CLI mode if invoked directly
if (process.argv[1] && process.argv[1].includes('hook-test-harness')) {
  main().catch(console.error);
}
