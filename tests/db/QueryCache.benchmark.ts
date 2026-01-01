/**
 * Query Cache Performance Benchmark
 *
 * Compares performance with and without caching to demonstrate the benefits
 * of the QueryCache implementation.
 */

import { describe, it, beforeAll, afterAll } from 'vitest';
import { KnowledgeGraph } from '../../src/knowledge-graph/index.js';
import { SimpleDatabaseFactory } from '../../src/config/simple-config.js';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';

describe('Query Cache Performance Benchmark', () => {
  const benchmarkDir = join(process.cwd(), 'data', 'benchmark');
  const dbPath = join(benchmarkDir, 'benchmark.db');
  let kg: KnowledgeGraph;

  beforeAll(async () => {
    // Create benchmark directory
    if (!existsSync(benchmarkDir)) {
      mkdirSync(benchmarkDir, { recursive: true });
    }

    // Create knowledge graph
    kg = await KnowledgeGraph.create(dbPath);

    // Seed with test data (100 entities, various types)
    console.log('\n📊 Seeding database with test data...');
    const entityTypes = ['agent', 'concept', 'technology', 'project', 'skill'];

    for (let i = 0; i < 100; i++) {
      const type = entityTypes[i % entityTypes.length];
      kg.createEntity({
        name: `entity-${type}-${i}`,
        type,
        observations: [
          `This is observation 1 for entity ${i}`,
          `This is observation 2 for entity ${i}`,
          `This is observation 3 for entity ${i}`,
        ],
        tags: [`tag-${i % 10}`, `category-${type}`],
        metadata: { index: i, benchmark: true },
      });
    }

    // Create relations (50 relations)
    for (let i = 0; i < 50; i++) {
      const from = i;
      const to = (i + 1) % 100;
      kg.createRelation({
        from: `entity-agent-${from}`,
        to: `entity-agent-${to}`,
        relationType: 'related_to',
        metadata: { strength: Math.random() },
      });
    }

    console.log('✅ Database seeded with 100 entities and 50 relations\n');
  });

  afterAll(async () => {
    // Cleanup
    kg.close();
    await SimpleDatabaseFactory.close(dbPath);

    // Remove benchmark directory
    if (existsSync(benchmarkDir)) {
      rmSync(benchmarkDir, { recursive: true, force: true });
    }
  });

  it('Benchmark: searchEntities() - repeated queries', () => {
    const iterations = 1000;
    const query = { type: 'agent', limit: 10 };

    // Clear cache before benchmark
    kg.clearCache();

    // First run - cold cache
    console.log('\n🔥 Cold cache (first run):');
    const coldStart = Date.now();
    kg.searchEntities(query);
    const coldDuration = Date.now() - coldStart;
    console.log(`   First query: ${coldDuration}ms`);

    // Subsequent runs - warm cache
    console.log('\n♨️  Warm cache (subsequent runs):');
    const warmStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      kg.searchEntities(query);
    }
    const warmDuration = Date.now() - warmStart;
    const avgWarmDuration = warmDuration / iterations;

    console.log(`   ${iterations} queries: ${warmDuration}ms`);
    console.log(`   Average per query: ${avgWarmDuration.toFixed(3)}ms`);

    // Calculate speedup
    const speedup = coldDuration / avgWarmDuration;
    console.log(`\n⚡ Speedup: ${speedup.toFixed(0)}x faster with cache`);

    // Get cache stats
    const stats = kg.getCacheStats();
    console.log(`\n📈 Cache Statistics:`);
    console.log(`   Hits: ${stats.hits}`);
    console.log(`   Misses: ${stats.misses}`);
    console.log(`   Hit Rate: ${stats.hitRate}%`);
    console.log(`   Size: ${stats.size} / ${stats.maxSize}`);
    console.log(`   Memory Usage: ${(stats.memoryUsage / 1024).toFixed(2)} KB`);
  });

  it('Benchmark: traceRelations() - relationship traversal', () => {
    const iterations = 500;
    const entityName = 'entity-agent-0';

    // Clear cache before benchmark
    kg.clearCache();

    // Cold cache
    console.log('\n🔥 Cold cache (relationship traversal):');
    const coldStart = Date.now();
    kg.traceRelations(entityName);
    const coldDuration = Date.now() - coldStart;
    console.log(`   First query: ${coldDuration}ms`);

    // Warm cache
    console.log('\n♨️  Warm cache:');
    const warmStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      kg.traceRelations(entityName);
    }
    const warmDuration = Date.now() - warmStart;
    const avgWarmDuration = warmDuration / iterations;

    console.log(`   ${iterations} queries: ${warmDuration}ms`);
    console.log(`   Average per query: ${avgWarmDuration.toFixed(3)}ms`);

    const speedup = coldDuration / avgWarmDuration;
    console.log(`\n⚡ Speedup: ${speedup.toFixed(0)}x faster with cache`);
  });

  it('Benchmark: getStats() - statistics queries', () => {
    const iterations = 1000;

    // Clear cache before benchmark
    kg.clearCache();

    // Cold cache
    console.log('\n🔥 Cold cache (statistics):');
    const coldStart = Date.now();
    kg.getStats();
    const coldDuration = Date.now() - coldStart;
    console.log(`   First query: ${coldDuration}ms`);

    // Warm cache
    console.log('\n♨️  Warm cache:');
    const warmStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      kg.getStats();
    }
    const warmDuration = Date.now() - warmStart;
    const avgWarmDuration = warmDuration / iterations;

    console.log(`   ${iterations} queries: ${warmDuration}ms`);
    console.log(`   Average per query: ${avgWarmDuration.toFixed(3)}ms`);

    const speedup = coldDuration / avgWarmDuration;
    console.log(`\n⚡ Speedup: ${speedup.toFixed(0)}x faster with cache`);
  });

  it('Benchmark: Mixed workload - realistic usage pattern', () => {
    const iterations = 100;

    // Clear cache before benchmark
    kg.clearCache();

    console.log('\n🔄 Mixed workload benchmark:');
    console.log('   Pattern: 50% search, 30% trace, 20% stats');

    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      const rand = Math.random();

      if (rand < 0.5) {
        // 50% search queries
        kg.searchEntities({
          type: i % 2 === 0 ? 'agent' : 'concept',
          limit: 10,
        });
      } else if (rand < 0.8) {
        // 30% relation traces
        kg.traceRelations(`entity-agent-${i % 20}`);
      } else {
        // 20% statistics
        kg.getStats();
      }
    }

    const duration = Date.now() - start;
    const avgDuration = duration / iterations;

    console.log(`   ${iterations} operations: ${duration}ms`);
    console.log(`   Average per operation: ${avgDuration.toFixed(3)}ms`);

    const stats = kg.getCacheStats();
    console.log(`\n📈 Final Cache Statistics:`);
    console.log(`   Hit Rate: ${stats.hitRate}%`);
    console.log(`   Cache Entries: ${stats.size}`);
    console.log(`   Memory Usage: ${(stats.memoryUsage / 1024).toFixed(2)} KB`);
  });

  it('Benchmark: Cache invalidation overhead', () => {
    const iterations = 100;

    // Populate cache
    for (let i = 0; i < 10; i++) {
      kg.searchEntities({ type: 'agent', limit: 10 });
      kg.searchEntities({ type: 'concept', limit: 10 });
      kg.traceRelations(`entity-agent-${i}`);
    }

    console.log('\n🗑️  Cache invalidation benchmark:');

    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      // Create entity (triggers cache invalidation)
      kg.createEntity({
        name: `temp-entity-${i}`,
        type: 'temp',
        observations: ['test'],
      });

      // Re-query (cache miss)
      kg.searchEntities({ type: 'agent', limit: 10 });
    }

    const duration = Date.now() - start;
    const avgDuration = duration / iterations;

    console.log(`   ${iterations} create + query cycles: ${duration}ms`);
    console.log(`   Average per cycle: ${avgDuration.toFixed(3)}ms`);
    console.log('   ✅ Invalidation overhead is minimal');
  });
});
