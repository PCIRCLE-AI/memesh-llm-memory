/**
 * CLI Dashboard Demo
 *
 * Quick demo of the memesh dashboard command
 * Run with: npm run demo:cli-dashboard
 */

import { runDashboard } from '../src/cli/dashboard.js';

console.log('Starting MeMesh Dashboard Demo...\n');
console.log('Press "q" to quit or "r" to manually refresh\n');
console.log('Dashboard will auto-refresh every 5 seconds\n');

runDashboard().catch((error) => {
  console.error('Dashboard error:', error);
  process.exit(1);
});
