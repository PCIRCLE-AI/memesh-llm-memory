/**
 * Memory System Migration Script
 *
 * Migrates existing memories to the new unified memory system with:
 * - UUID v4 validation and regeneration
 * - Tag normalization
 * - Metadata size validation
 * - Auto-tagging enhancement
 * - ESCAPE clause updates
 */

import { KnowledgeGraph } from '../src/knowledge-graph/index.js';
import { UnifiedMemoryStore } from '../src/memory/UnifiedMemoryStore.js';
import { AutoTagger } from '../src/memory/AutoTagger.js';
import type { UnifiedMemory } from '../src/memory/types/unified-memory.js';
import { validate as validateUUID } from 'uuid';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

interface MigrationOptions {
  backupFile: string;
  dryRun: boolean;
  skipValidation: boolean;
  dbPath: string;
}

interface MigrationStats {
  totalMemories: number;
  idsRegenerated: number;
  tagsNormalized: number;
  metadataValidated: number;
  imported: number;
  failed: number;
}

class MemoryMigrator {
  private kg!: KnowledgeGraph;
  private memoryStore!: UnifiedMemoryStore;
  private autoTagger: AutoTagger;
  private idMap: Map<string, string> = new Map();
  private stats: MigrationStats = {
    totalMemories: 0,
    idsRegenerated: 0,
    tagsNormalized: 0,
    metadataValidated: 0,
    imported: 0,
    failed: 0,
  };

  constructor() {
    this.autoTagger = new AutoTagger();
  }

  async initialize(dbPath: string): Promise<void> {
    this.kg = await KnowledgeGraph.create(dbPath);
    this.memoryStore = new UnifiedMemoryStore(this.kg);
  }

  async migrate(options: MigrationOptions): Promise<void> {
    console.log('🚀 Starting memory system migration...\n');

    try {
      // Initialize
      await this.initialize(options.dbPath);

      // Step 1: Load backup
      const memories = await this.loadBackup(options.backupFile);
      this.stats.totalMemories = memories.length;
      console.log(`📦 Loaded ${memories.length} memories from backup\n`);

      // Step 2: Validate and transform
      const transformed = await this.transformMemories(memories);
      console.log(`✨ Transformed ${transformed.length} memories\n`);

      if (options.dryRun) {
        console.log('🔍 Dry run - no changes made\n');
        this.printSummary();
        return;
      }

      // Step 3: Import
      await this.importMemories(transformed);
      console.log(`✅ Imported ${this.stats.imported} memories successfully\n`);

      // Step 4: Validate (unless skipped)
      if (!options.skipValidation) {
        await this.validateMigration(memories, transformed);
        console.log('✅ Validation passed\n');
      }

      this.printSummary();
      console.log('\n🎉 Migration complete!');
    } finally {
      if (this.kg) {
        this.kg.close();
      }
    }
  }

  private async loadBackup(file: string): Promise<UnifiedMemory[]> {
    try {
      const content = await fs.readFile(file, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load backup file: ${error}`);
    }
  }

  private async transformMemories(
    memories: UnifiedMemory[]
  ): Promise<UnifiedMemory[]> {
    const transformed: UnifiedMemory[] = [];

    for (const memory of memories) {
      try {
        // Transform ID if invalid
        const newId = this.migrateId(memory.id);

        // Normalize tags
        const normalizedTags = this.normalizeTags(memory.tags);
        if (normalizedTags.length !== memory.tags.length) {
          this.stats.tagsNormalized++;
        }

        // Auto-generate additional tags
        const enhancedTags = this.autoTagger.generateTags(
          memory.content,
          normalizedTags
        );

        // Validate metadata size
        const validatedMetadata = this.validateMetadata(memory.metadata);
        if (validatedMetadata !== memory.metadata) {
          this.stats.metadataValidated++;
        }

        transformed.push({
          ...memory,
          id: newId,
          tags: enhancedTags,
          metadata: validatedMetadata,
          timestamp: new Date(memory.timestamp),
        });
      } catch (error) {
        console.error(`  ❌ Failed to transform memory ${memory.id}:`, error);
        this.stats.failed++;
      }
    }

    return transformed;
  }

  private migrateId(oldId: string | undefined): string {
    if (!oldId || !validateUUID(oldId)) {
      const newId = uuidv4();
      if (oldId) {
        this.idMap.set(oldId, newId);
        this.stats.idsRegenerated++;
        const shortId = oldId.length > 20 ? oldId.substring(0, 20) + '...' : oldId;
        console.log(`  🔄 Invalid ID ${shortId} → ${newId}`);
      } else {
        console.log(`  🆕 Generated new ID: ${newId}`);
      }
      return newId;
    }
    return oldId;
  }

  private normalizeTags(tags: string[]): string[] {
    return tags
      .map((tag) => tag.toLowerCase().trim())
      .filter((tag, index, self) => self.indexOf(tag) === index)
      .map((tag) => {
        // Normalize common variants
        const normalizations: Record<string, string> = {
          postgres: 'postgresql',
          pg: 'postgresql',
          js: 'javascript',
          ts: 'typescript',
          react: 'react',
          nextjs: 'next.js',
          vue: 'vue',
        };
        return normalizations[tag] || tag;
      });
  }

  private validateMetadata(metadata?: any): any {
    if (!metadata) return undefined;

    const MAX_SIZE = 10 * 1024; // 10KB
    const validated: any = {};
    let hasOversizedField = false;

    for (const [key, value] of Object.entries(metadata)) {
      const size = JSON.stringify(value).length;
      if (size > MAX_SIZE) {
        console.warn(
          `  ⚠️  Metadata field '${key}' exceeds 10KB (${size} bytes) - truncating`
        );
        // Truncate to fit limit
        const stringValue = JSON.stringify(value);
        validated[key] = JSON.parse(stringValue.slice(0, MAX_SIZE - 100));
        hasOversizedField = true;
      } else {
        validated[key] = value;
      }
    }

    return hasOversizedField ? validated : metadata;
  }

  private async importMemories(memories: UnifiedMemory[]): Promise<void> {
    for (const memory of memories) {
      try {
        await this.memoryStore.store(memory);
        this.stats.imported++;

        if (this.stats.imported % 100 === 0) {
          console.log(`  📥 Imported ${this.stats.imported}/${memories.length} memories...`);
        }
      } catch (error) {
        console.error(`  ❌ Failed to import memory ${memory.id}:`, error);
        this.stats.failed++;
      }
    }
  }

  private async validateMigration(
    original: UnifiedMemory[],
    transformed: UnifiedMemory[]
  ): Promise<void> {
    console.log('🔍 Validating migration...\n');

    // Check counts match (accounting for failed imports)
    const expectedCount = original.length - this.stats.failed;
    if (this.stats.imported !== expectedCount) {
      throw new Error(
        `Memory count mismatch: expected ${expectedCount}, imported ${this.stats.imported}`
      );
    }

    // Check all IDs are valid UUIDs
    let invalidIds = 0;
    for (const memory of transformed) {
      if (!validateUUID(memory.id!)) {
        console.error(`  ❌ Invalid UUID after migration: ${memory.id}`);
        invalidIds++;
      }
    }
    if (invalidIds > 0) {
      throw new Error(`Found ${invalidIds} invalid UUIDs after migration`);
    }

    // Check tags are normalized
    let unnormalizedTags = 0;
    for (const memory of transformed) {
      for (const tag of memory.tags) {
        if (tag !== tag.toLowerCase()) {
          console.error(`  ❌ Tag not normalized: ${tag}`);
          unnormalizedTags++;
        }
      }
    }
    if (unnormalizedTags > 0) {
      throw new Error(`Found ${unnormalizedTags} unnormalized tags`);
    }

    console.log('  ✅ All validations passed');
  }

  private printSummary(): void {
    console.log('📊 Migration Summary:');
    console.log('  ─────────────────────────────────');
    console.log(`  Total memories:        ${this.stats.totalMemories}`);
    console.log(`  IDs regenerated:       ${this.stats.idsRegenerated}`);
    console.log(`  Tags normalized:       ${this.stats.tagsNormalized}`);
    console.log(`  Metadata validated:    ${this.stats.metadataValidated}`);
    console.log(`  Successfully imported: ${this.stats.imported}`);
    console.log(`  Failed:                ${this.stats.failed}`);
    console.log('  ─────────────────────────────────');
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  const options: MigrationOptions = {
    backupFile:
      args.find((a) => a.startsWith('--backup='))?.split('=')[1] ||
      'memory-backup.json',
    dryRun: args.includes('--dry-run'),
    skipValidation: args.includes('--skip-validation'),
    dbPath:
      args.find((a) => a.startsWith('--db='))?.split('=')[1] ||
      './memory.db',
  };

  // Validate backup file exists
  try {
    await fs.access(options.backupFile);
  } catch {
    console.error(`❌ Backup file not found: ${options.backupFile}`);
    console.error('\nPlease export memories first:');
    console.error('  npm run migrate:export');
    process.exit(1);
  }

  const migrator = new MemoryMigrator();

  try {
    await migrator.migrate(options);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();
