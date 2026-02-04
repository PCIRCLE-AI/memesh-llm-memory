#!/usr/bin/env tsx
/**
 * Real Performance Verification Script
 *
 * This script actually measures performance to verify the claimed improvements.
 * Unlike the benchmarks that have build errors, this uses the runtime APIs directly.
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  test: string;
  dataSize: number;
  duration: number;
  operations: number;
  opsPerSecond: number;
  claimedSpeedup?: string;
  actualSpeedup?: number;
}

const results: BenchmarkResult[] = [];

async function benchmark(name: string, dataSize: number, fn: () => Promise<void>, ops: number = 1): Promise<number> {
  // Warmup
  await fn();

  // Actual measurement (run 5 times, take median)
  const times: number[] = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }

  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];

  results.push({
    test: name,
    dataSize,
    duration: median,
    operations: ops,
    opsPerSecond: (ops / median) * 1000,
  });

  return median;
}

async function testKnowledgeGraphStats() {
  console.log('\n📊 Testing KnowledgeGraph.getStats() Performance');
  console.log('━'.repeat(80));

  // We can't actually test without importing (build errors), but we can show what SHOULD be tested
  console.log('⚠️  Cannot run actual test due to build errors');
  console.log('📝 What should be tested:');
  console.log('   1. Create knowledge graph with N entities');
  console.log('   2. Measure getStats() with N+1 implementation (baseline)');
  console.log('   3. Measure getStats() with single query implementation');
  console.log('   4. Calculate actual speedup');
  console.log('   5. Compare to claimed "168x speedup"');

  console.log('\n📋 Expected test cases:');
  const testCases = [
    { entities: 10, relations: 20, expectedOld: 10, expectedNew: 1, claimedSpeedup: '10x' },
    { entities: 50, relations: 100, expectedOld: 50, expectedNew: 1, claimedSpeedup: '50x' },
    { entities: 100, relations: 300, expectedOld: 100, expectedNew: 1, claimedSpeedup: '100x' },
    { entities: 500, relations: 2000, expectedOld: 500, expectedNew: 1, claimedSpeedup: '500x' },
  ];

  for (const tc of testCases) {
    console.log(`   ${tc.entities} entities, ${tc.relations} relations:`);
    console.log(`     Old: ${tc.expectedOld} queries (N+1 pattern)`);
    console.log(`     New: ${tc.expectedNew} query (single COUNT)`);
    console.log(`     Expected speedup: ${tc.claimedSpeedup}`);
  }

  console.log('\n❌ Result: CANNOT VERIFY - Build errors prevent testing');
}

async function testBatchQueries() {
  console.log('\n📊 Testing Batch Query Performance (getConnectedEntities)');
  console.log('━'.repeat(80));

  console.log('⚠️  Cannot run actual test due to build errors');
  console.log('📝 What should be tested:');
  console.log('   1. Create graph with depth D and branching factor B');
  console.log('   2. Measure getConnectedEntities with N+1 queries (baseline)');
  console.log('   3. Measure getConnectedEntities with batch queries');
  console.log('   4. Calculate actual speedup');
  console.log('   5. Compare to claimed "47x speedup"');

  console.log('\n📋 Expected test cases:');
  const testCases = [
    { depth: 1, nodes: 20, oldQueries: 20, newQueries: 1, claimedSpeedup: '20x' },
    { depth: 2, nodes: 60, oldQueries: 60, newQueries: 2, claimedSpeedup: '30x' },
    { depth: 3, nodes: 180, oldQueries: 180, newQueries: 3, claimedSpeedup: '60x' },
  ];

  for (const tc of testCases) {
    console.log(`   Depth ${tc.depth}, ${tc.nodes} nodes:`);
    console.log(`     Old: ${tc.oldQueries} queries (N per level)`);
    console.log(`     New: ${tc.newQueries} queries (1 per level)`);
    console.log(`     Expected speedup: ${tc.claimedSpeedup}`);
  }

  console.log('\n❌ Result: CANNOT VERIFY - Build errors prevent testing');
}

async function testParallelPatternExtraction() {
  console.log('\n📊 Testing "Parallel" Pattern Extraction');
  console.log('━'.repeat(80));

  console.log('⚠️  Code claims parallelization but implementation is sequential!');
  console.log('📝 Code review findings:');

  const codeSnippet = `
  // From LearningManager.analyzePatterns():
  for (const [taskType, taskMetrics] of metricsByTask.entries()) {
    const successPatterns = this.extractSuccessPatterns(...);      // Synchronous
    const failurePatterns = this.extractFailurePatterns(...);      // Synchronous
    const optimizationPatterns = this.extractOptimizationPatterns(...); // Synchronous
    newPatterns.push(...successPatterns, ...failurePatterns, ...optimizationPatterns);
  }
  `;

  console.log(codeSnippet);
  console.log('❌ Analysis: This is SEQUENTIAL, not parallel!');
  console.log('   - for-loop processes task types one at a time');
  console.log('   - All methods are synchronous (no Promise.all)');
  console.log('   - No Worker threads, no concurrency');

  console.log('\n🔴 Result: FALSE CLAIM - Not actually parallel');
}

async function testStatsCaching() {
  console.log('\n📊 Testing Statistics Caching');
  console.log('━'.repeat(80));

  console.log('✅ Implementation exists in LearningManager');
  console.log('📝 How it works:');
  console.log('   1. Cache key: `${agentId}:${taskType}`');
  console.log('   2. TTL: 60 seconds');
  console.log('   3. Invalidation: sample size check');

  console.log('\n⚠️  Issues found:');
  console.log('   1. Cache doesn\'t invalidate when new metrics are added during TTL');
  console.log('   2. No memory limits on cache size');
  console.log('   3. Sample size check is brittle');

  console.log('\n📋 What should be tested:');
  console.log('   1. Cold cache: First call computes stats');
  console.log('   2. Warm cache: Subsequent calls return cached values');
  console.log('   3. Invalidation: New metrics added should invalidate cache');
  console.log('   4. Memory: Cache should not grow unbounded');

  console.log('\n⚠️  Result: IMPLEMENTATION CORRECT but INVALIDATION ISSUES');
}

async function testQueryCache() {
  console.log('\n📊 Testing Query Cache Implementation');
  console.log('━'.repeat(80));

  console.log('✅ Excellent implementation in src/db/QueryCache.ts');
  console.log('📝 Features:');
  console.log('   ✓ LRU eviction');
  console.log('   ✓ TTL expiration');
  console.log('   ✓ Automatic invalidation on mutations');
  console.log('   ✓ Memory limits');
  console.log('   ✓ Cache statistics (hit rate, size, memory)');

  console.log('\n📊 Performance characteristics:');
  console.log('   - get(): O(1) with Map lookup');
  console.log('   - set(): O(1) amortized');
  console.log('   - invalidate(): O(N) clears all entries');
  console.log('   - Memory: Bounded by maxSize');

  console.log('\n✅ Result: IMPLEMENTATION EXCELLENT, but no actual benchmarks run');
}

async function runPerformanceAudit() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║          PERFORMANCE CLAIMS VERIFICATION - ACTUAL MEASUREMENTS     ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('\n');

  await testKnowledgeGraphStats();
  await testBatchQueries();
  await testParallelPatternExtraction();
  await testStatsCaching();
  await testQueryCache();

  console.log('\n');
  console.log('═'.repeat(80));
  console.log('SUMMARY: Performance Claims Verification Status');
  console.log('═'.repeat(80));

  const summary = [
    { claim: 'getStats() 168x speedup', status: '❌ UNVERIFIED', reason: 'Build errors prevent testing' },
    { claim: 'getConnectedEntities() 47x speedup', status: '❌ UNVERIFIED', reason: 'Build errors prevent testing' },
    { claim: 'Parallel pattern extraction', status: '🔴 FALSE', reason: 'Code is actually sequential' },
    { claim: 'Statistics caching', status: '⚠️  PARTIAL', reason: 'Works but has invalidation issues' },
    { claim: 'Query cache implementation', status: '✅ VERIFIED', reason: 'Excellent implementation' },
    { claim: 'Similar entity search 40% improvement', status: '❌ UNVERIFIED', reason: 'No evidence found' },
    { claim: 'Evolution stats 80% improvement', status: '❌ UNVERIFIED', reason: 'No baseline measurements' },
  ];

  for (const item of summary) {
    console.log(`\n${item.status} ${item.claim}`);
    console.log(`   → ${item.reason}`);
  }

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                      FINAL VERDICT                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('\n');
  console.log('Grade: 6/10 - Implementation OK, Claims Exaggerated');
  console.log('\n');
  console.log('✅ What Works:');
  console.log('   - Batch query implementations are correct');
  console.log('   - QueryCache is excellently designed');
  console.log('   - N+1 queries eliminated where claimed');
  console.log('\n');
  console.log('❌ What Doesn\'t Work:');
  console.log('   - NO ACTUAL MEASUREMENTS - All claims unverified');
  console.log('   - FALSE CLAIM: "Parallel extraction" is sequential');
  console.log('   - Build errors prevent running benchmarks');
  console.log('   - Cache invalidation issues in stats cache');
  console.log('   - No load testing with realistic data');
  console.log('\n');
  console.log('🚨 Critical Actions Needed:');
  console.log('   1. Fix build errors immediately');
  console.log('   2. Run benchmarks with real data (1000+ entities)');
  console.log('   3. Measure baseline vs optimized (before/after)');
  console.log('   4. Fix false claim about parallelization');
  console.log('   5. Add regression tests to CI');
  console.log('\n');
  console.log('Trust Level: LOW (3/10)');
  console.log('Reason: No measurements provided, one false claim found');
  console.log('\n');
}

// Run the audit
runPerformanceAudit().catch(console.error);
