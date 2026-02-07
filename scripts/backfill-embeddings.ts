#!/usr/bin/env tsx
/**
 * Backfill embeddings for existing entities
 *
 * This script generates embeddings for entities that don't have one yet.
 * It processes entities in batches to manage memory and provides progress reporting.
 *
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts
 *   npx tsx scripts/backfill-embeddings.ts --batch-size 50
 *   npx tsx scripts/backfill-embeddings.ts --dry-run
 *   npx tsx scripts/backfill-embeddings.ts --verbose
 */

import { KnowledgeGraphSQLite } from '../src/agents/knowledge/KnowledgeGraphSQLite.js';
import { LazyEmbeddingService } from '../src/embeddings/index.js';

interface BackfillOptions {
  batchSize: number;
  dryRun: boolean;
  verbose: boolean;
}

async function backfillEmbeddings(options: BackfillOptions): Promise<void> {
  const { batchSize, dryRun, verbose } = options;

  console.log('🚀 Starting embedding backfill...');
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Dry run: ${dryRun}`);
  console.log('');

  // Initialize knowledge graph
  const kg = new KnowledgeGraphSQLite();
  await kg.initialize();

  // Get entities without embeddings
  const entitiesWithoutEmbedding = await kg.getEntitiesWithoutEmbeddings();
  const total = entitiesWithoutEmbedding.length;

  // Show current stats
  const stats = kg.getEmbeddingStats();
  console.log('📊 Current embedding stats:');
  console.log(`   With embeddings: ${stats.withEmbeddings}`);
  console.log(`   Without embeddings: ${stats.withoutEmbeddings}`);
  console.log(`   Total entities: ${stats.total}`);
  console.log('');

  if (total === 0) {
    console.log('✅ All entities already have embeddings!');
    return;
  }

  if (dryRun) {
    console.log('🔍 Dry run - entities that would be processed:');
    for (const entity of entitiesWithoutEmbedding.slice(0, 10)) {
      console.log(`   - ${entity.name} (${entity.entityType})`);
    }
    if (total > 10) {
      console.log(`   ... and ${total - 10} more`);
    }
    return;
  }

  // Initialize embedding service
  console.log('⏳ Loading embedding model...');
  const embeddingService = await LazyEmbeddingService.get();
  console.log('✅ Model loaded\n');

  // Process in batches
  let processed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < total; i += batchSize) {
    const batch = entitiesWithoutEmbedding.slice(i, i + batchSize);

    for (const entity of batch) {
      try {
        // Create text from name + observations
        const textParts = [entity.name];
        if (entity.observations?.length) {
          textParts.push(...entity.observations);
        }
        const text = textParts.join(' ');

        // Generate embedding
        const embedding = await embeddingService.encode(text);

        // Store embedding
        kg.updateEntityEmbedding(entity.name, embedding);

        processed++;

        if (verbose) {
          console.log(`✓ ${entity.name}`);
        }
      } catch (error) {
        failed++;
        console.error(
          `✗ Failed: ${entity.name} - ${error instanceof Error ? error.message : error}`
        );
      }
    }

    // Progress update
    const progress = (((i + batch.length) / total) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(
      `\r📈 Progress: ${progress}% (${processed}/${total}) - ${elapsed}s elapsed`
    );
  }

  console.log('\n');
  console.log('═'.repeat(50));
  console.log('📊 Backfill Complete');
  console.log('═'.repeat(50));
  console.log(`   Total entities: ${total}`);
  console.log(`   ✅ Processed: ${processed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏱️  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log('═'.repeat(50));

  // Cleanup
  await LazyEmbeddingService.dispose();
}

// Parse command line arguments
function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);

  return {
    batchSize: parseInt(args.find((a) => a.startsWith('--batch-size='))?.split('=')[1] || '20'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

// Main
const options = parseArgs();
backfillEmbeddings(options).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
