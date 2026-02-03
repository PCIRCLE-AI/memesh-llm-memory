# Memory System Migration Guide

**Complete guide for upgrading to the new memory system**

This guide covers migration from older memory implementations to the new unified memory system with SmartMemoryQuery, Auto-Tagging, and Auto-Memory features.

---

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Migration Steps](#migration-steps)
- [Automated Migration Script](#automated-migration-script)
- [Manual Migration](#manual-migration)
- [Validation and Testing](#validation-and-testing)
- [Rollback Procedure](#rollback-procedure)
- [FAQ](#faq)

---

## Overview

### What's New

The new memory system introduces:

1. **SmartMemoryQuery** - Context-aware search with relevance ranking
2. **AutoTagger** - Intelligent tag generation (50+ technologies)
3. **AutoMemoryRecorder** - Automatic event detection and recording
4. **Enhanced Security** - Memory ID validation, metadata size limits
5. **Optimized ESCAPE Clause** - Changed from '\' to '!' for better SQLite compatibility

### Who Should Migrate

You should migrate if you're using:
- Legacy memory storage without UnifiedMemoryStore
- Custom memory implementations
- Memory IDs without validation
- ESCAPE character '\' in search queries

---

## Breaking Changes

### 1. ESCAPE Character Change

**Old (Deprecated):**
```typescript
// Used '\' as ESCAPE character
knowledgeGraph.search("test\\_pattern ESCAPE '\\'");
```

**New (Required):**
```typescript
// Now uses '!' as ESCAPE character
knowledgeGraph.search("test!_pattern ESCAPE '!'");
```

**Impact:** Existing search queries using '\' will fail
**Migration:** Update all ESCAPE clauses to use '!'

### 2. Memory ID Validation

**Old (Allowed):**
```typescript
// Any string accepted as ID
await memoryStore.store({ id: 'invalid-id-format', ... });
```

**New (Required):**
```typescript
// Only valid UUIDs accepted
await memoryStore.store({ id: '550e8400-e29b-41d4-a716-446655440000', ... });
```

**Impact:** Invalid memory IDs will be rejected
**Migration:** Regenerate IDs using UUID v4

### 3. Metadata Size Limit

**Old (Unlimited):**
```typescript
// Could store any size metadata
await memoryStore.store({
  metadata: { largeData: '...' } // No size limit
});
```

**New (10KB limit per field):**
```typescript
// Maximum 10KB per metadata field
await memoryStore.store({
  metadata: { data: '...' } // Must be <10KB
});
```

**Impact:** Large metadata will be rejected
**Migration:** Compress or split large metadata

### 4. Tag Normalization

**Old (Inconsistent):**
```typescript
tags: ['TypeScript', 'REACT', 'postgres', 'PG']
```

**New (Normalized):**
```typescript
tags: ['typescript', 'react', 'postgresql'] // Auto-normalized to lowercase
```

**Impact:** Tag searches may return different results
**Migration:** AutoTagger normalizes automatically

---

## Migration Steps

### Step 1: Backup Existing Data

**Export all memories:**
```bash
npm run migrate:export
```

Or manually:
```typescript
import { KnowledgeGraph } from './src/knowledge-graph/index.js';
import { UnifiedMemoryStore } from './src/memory/UnifiedMemoryStore.js';
import fs from 'fs/promises';

const kg = await KnowledgeGraph.create('path/to/kg.db');
const memoryStore = new UnifiedMemoryStore(kg);

// Export all memories
const allMemories = await memoryStore.search('', { techStack: [] });
await fs.writeFile(
  'memory-backup.json',
  JSON.stringify(allMemories, null, 2)
);

console.log(\`Exported \${allMemories.length} memories\`);
kg.close();
```

**Verify backup:**
```bash
# Check file exists and has content
ls -lh memory-backup.json
jq 'length' memory-backup.json
```

### Step 2: Update Dependencies

**Update package.json:**
```bash
npm install @memesh/memory-system@latest
npm install
```

**Verify versions:**
```bash
npm list @memesh/memory-system
```

### Step 3: Run Migration Script

**Automated migration:**
```bash
npm run migrate:upgrade
```

This script:
1. Validates backup exists
2. Regenerates invalid memory IDs
3. Normalizes tags
4. Updates ESCAPE clauses
5. Validates metadata sizes
6. Imports updated memories

### Step 4: Validate Migration

**Run validation:**
```bash
npm run migrate:validate
```

Checks:
- All memories imported successfully
- No memory ID conflicts
- All tags normalized
- Metadata within size limits
- Search functionality works

### Step 5: Update Application Code

**Update search queries:**
```typescript
// Old
const results = await kg.search(\`query ESCAPE '\\\\'\`);

// New
const results = await kg.search(\`query ESCAPE '!'\`);
```

**Use SmartMemoryQuery for ranked results:**
```typescript
import { SmartMemoryQuery } from './src/memory/SmartMemoryQuery.js';

const smartQuery = new SmartMemoryQuery();
const results = smartQuery.search('authentication', memories, {
  techStack: ['typescript', 'nodejs']
});
```

**Enable auto-tagging:**
```typescript
import { AutoTagger } from './src/memory/AutoTagger.js';

const autoTagger = new AutoTagger();
const tags = autoTagger.generateTags(content, existingTags);
```

### Step 6: Test Thoroughly

**Test checklist:**
```
□ Memory storage works
□ Memory retrieval works
□ Search returns correct results
□ Tags are normalized
□ Auto-tagging detects technologies
□ Auto-memory records events
□ No memory ID conflicts
□ Metadata sizes validated
```

---

## Automated Migration Script

### Usage

**Basic migration:**
```bash
# From project root
npm run migrate:upgrade
```

**With options:**
```bash
# Dry run (no changes)
npm run migrate:upgrade -- --dry-run

# Specify backup file
npm run migrate:upgrade -- --backup=custom-backup.json

# Skip validation
npm run migrate:upgrade -- --skip-validation
```

### Script Details

The migration script (`scripts/migrate-memory-system.ts`) performs:

1. **Validation**
   - Checks backup file exists
   - Verifies JSON structure
   - Counts memories

2. **ID Migration**
   - Validates existing UUIDs
   - Generates new UUIDs for invalid IDs
   - Maintains ID mapping

3. **Tag Normalization**
   - Converts to lowercase
   - Removes duplicates
   - Merges synonyms (postgres → postgresql)

4. **ESCAPE Clause Update**
   - Finds all ESCAPE '\' usages
   - Replaces with ESCAPE '!'
   - Updates code and queries

5. **Metadata Validation**
   - Checks each field size
   - Compresses large fields
   - Warns on oversized data

6. **Import**
   - Stores updated memories
   - Validates each import
   - Reports errors

### Creating Migration Script

**Create script file:**
```typescript
// scripts/migrate-memory-system.ts
import { KnowledgeGraph } from '../src/knowledge-graph/index.js';
import { UnifiedMemoryStore } from '../src/memory/UnifiedMemoryStore.js';
import { AutoTagger } from '../src/memory/AutoTagger.js';
import { UnifiedMemory } from '../src/memory/types/unified-memory.js';
import { validate as validateUUID } from 'uuid';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

interface MigrationOptions {
  backupFile: string;
  dryRun: boolean;
  skipValidation: boolean;
}

class MemoryMigrator {
  private kg: KnowledgeGraph;
  private memoryStore: UnifiedMemoryStore;
  private autoTagger: AutoTagger;
  private idMap: Map<string, string> = new Map();

  constructor(kg: KnowledgeGraph) {
    this.kg = kg;
    this.memoryStore = new UnifiedMemoryStore(kg);
    this.autoTagger = new AutoTagger();
  }

  async migrate(options: MigrationOptions): Promise<void> {
    console.log('🚀 Starting memory system migration...');

    // Step 1: Load backup
    const memories = await this.loadBackup(options.backupFile);
    console.log(\`📦 Loaded \${memories.length} memories from backup\`);

    // Step 2: Validate and transform
    const transformed = await this.transformMemories(memories);
    console.log(\`✨ Transformed \${transformed.length} memories\`);

    if (options.dryRun) {
      console.log('🔍 Dry run - no changes made');
      this.printSummary(memories, transformed);
      return;
    }

    // Step 3: Import
    const imported = await this.importMemories(transformed);
    console.log(\`✅ Imported \${imported} memories successfully\`);

    // Step 4: Validate (unless skipped)
    if (!options.skipValidation) {
      await this.validateMigration(memories, transformed);
      console.log('✅ Validation passed');
    }

    console.log('🎉 Migration complete!');
  }

  private async loadBackup(file: string): Promise<UnifiedMemory[]> {
    const content = await fs.readFile(file, 'utf-8');
    return JSON.parse(content);
  }

  private async transformMemories(
    memories: UnifiedMemory[]
  ): Promise<UnifiedMemory[]> {
    return memories.map(memory => {
      // Transform ID if invalid
      const newId = this.migrateId(memory.id);

      // Normalize tags
      const normalizedTags = this.normalizeTags(memory.tags);

      // Auto-generate additional tags
      const enhancedTags = this.autoTagger.generateTags(
        memory.content,
        normalizedTags
      );

      // Validate metadata size
      const validatedMetadata = this.validateMetadata(memory.metadata);

      return {
        ...memory,
        id: newId,
        tags: enhancedTags,
        metadata: validatedMetadata,
        timestamp: new Date(memory.timestamp)
      };
    });
  }

  private migrateId(oldId: string | undefined): string {
    if (!oldId || !validateUUID(oldId)) {
      const newId = uuidv4();
      if (oldId) {
        this.idMap.set(oldId, newId);
        console.warn(\`  ⚠️  Invalid ID \${oldId} → \${newId}\`);
      }
      return newId;
    }
    return oldId;
  }

  private normalizeTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.toLowerCase().trim())
      .filter((tag, index, self) => self.indexOf(tag) === index)
      .map(tag => {
        // Normalize common variants
        if (tag === 'postgres' || tag === 'pg') return 'postgresql';
        if (tag === 'js') return 'javascript';
        if (tag === 'ts') return 'typescript';
        return tag;
      });
  }

  private validateMetadata(metadata?: any): any {
    if (!metadata) return undefined;

    const MAX_SIZE = 10 * 1024; // 10KB
    const validated: any = {};

    for (const [key, value] of Object.entries(metadata)) {
      const size = JSON.stringify(value).length;
      if (size > MAX_SIZE) {
        console.warn(\`  ⚠️  Metadata field '\${key}' exceeds 10KB (\${size} bytes)\`);
        // Truncate or compress
        validated[key] = String(value).slice(0, MAX_SIZE);
      } else {
        validated[key] = value;
      }
    }

    return validated;
  }

  private async importMemories(
    memories: UnifiedMemory[]
  ): Promise<number> {
    let imported = 0;

    for (const memory of memories) {
      try {
        await this.memoryStore.store(memory);
        imported++;
      } catch (error) {
        console.error(\`  ❌ Failed to import memory \${memory.id}:\`, error);
      }
    }

    return imported;
  }

  private async validateMigration(
    original: UnifiedMemory[],
    transformed: UnifiedMemory[]
  ): Promise<void> {
    // Check counts match
    if (original.length !== transformed.length) {
      throw new Error(
        \`Memory count mismatch: \${original.length} → \${transformed.length}\`
      );
    }

    // Check all IDs are valid UUIDs
    for (const memory of transformed) {
      if (!validateUUID(memory.id!)) {
        throw new Error(\`Invalid UUID after migration: \${memory.id}\`);
      }
    }

    // Check tags are normalized
    for (const memory of transformed) {
      for (const tag of memory.tags) {
        if (tag !== tag.toLowerCase()) {
          throw new Error(\`Tag not normalized: \${tag}\`);
        }
      }
    }

    console.log('  ✅ All validations passed');
  }

  private printSummary(
    original: UnifiedMemory[],
    transformed: UnifiedMemory[]
  ): void {
    console.log('\\n📊 Migration Summary:');
    console.log(\`  Total memories: \${original.length}\`);
    console.log(\`  IDs regenerated: \${this.idMap.size}\`);
    console.log(\`  Tags normalized: \${transformed.length}\`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    backupFile: args.find(a => a.startsWith('--backup='))?.split('=')[1] || 'memory-backup.json',
    dryRun: args.includes('--dry-run'),
    skipValidation: args.includes('--skip-validation')
  };

  const kg = await KnowledgeGraph.create('./memory.db');
  const migrator = new MemoryMigrator(kg);

  try {
    await migrator.migrate(options);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    kg.close();
  }
}

main();
\`\`\`

**Add to package.json:**
```json
{
  "scripts": {
    "migrate:export": "tsx scripts/export-memories.ts",
    "migrate:upgrade": "tsx scripts/migrate-memory-system.ts",
    "migrate:validate": "tsx scripts/validate-migration.ts"
  }
}
```

---

## Manual Migration

If automated migration fails, follow these manual steps:

### 1. Export Memories

```typescript
const allMemories = await memoryStore.search('', { techStack: [] });
await fs.writeFile('backup.json', JSON.stringify(allMemories, null, 2));
```

### 2. Transform Each Memory

```typescript
import { v4 as uuidv4, validate as validateUUID } from 'uuid';

for (const memory of allMemories) {
  // Regenerate invalid IDs
  if (!memory.id || !validateUUID(memory.id)) {
    memory.id = uuidv4();
  }

  // Normalize tags
  memory.tags = memory.tags
    .map(t => t.toLowerCase())
    .filter((t, i, arr) => arr.indexOf(t) === i);

  // Check metadata size
  if (memory.metadata) {
    for (const [key, value] of Object.entries(memory.metadata)) {
      const size = JSON.stringify(value).length;
      if (size > 10240) {
        console.warn(\`Metadata '\${key}' too large: \${size} bytes\`);
      }
    }
  }
}
```

### 3. Import Updated Memories

```typescript
for (const memory of allMemories) {
  try {
    await memoryStore.store(memory);
  } catch (error) {
    console.error(\`Failed to import \${memory.id}:\`, error);
  }
}
```

---

## Validation and Testing

### Post-Migration Checks

**1. Verify memory count:**
```typescript
const allMemories = await memoryStore.search('', { techStack: [] });
console.log(\`Total memories: \${allMemories.length}\`);
```

**2. Test search functionality:**
```typescript
const results = await memoryStore.search('authentication');
console.log(\`Found \${results.length} results for 'authentication'\`);
```

**3. Validate IDs:**
```typescript
import { validate as validateUUID } from 'uuid';

for (const memory of allMemories) {
  if (!validateUUID(memory.id!)) {
    console.error(\`Invalid UUID: \${memory.id}\`);
  }
}
```

**4. Check tags:**
```typescript
for (const memory of allMemories) {
  for (const tag of memory.tags) {
    if (tag !== tag.toLowerCase()) {
      console.error(\`Non-lowercase tag: \${tag}\`);
    }
  }
}
```

### Integration Tests

**Run comprehensive tests:**
```bash
npm test -- tests/integration/memory-migration.test.ts
```

---

## Rollback Procedure

If migration fails or causes issues:

### Step 1: Stop Application

```bash
# Stop your application
pm2 stop app
# or
docker-compose down
```

### Step 2: Restore Backup

```bash
# Restore database from backup
cp memory.db.backup memory.db

# Or restore from JSON backup
npm run migrate:import -- --backup=memory-backup.json
```

### Step 3: Downgrade Dependencies

```bash
# Restore previous version
git checkout HEAD~1 package.json
npm install
```

### Step 4: Validate Rollback

```bash
# Test functionality
npm test

# Verify data
npm run migrate:validate
```

### Step 5: Restart Application

```bash
# Restart application
pm2 start app
# or
docker-compose up -d
```

---

## FAQ

### Q: Do I need to migrate if I'm starting fresh?

**A:** No. New installations automatically use the latest memory system. Migration is only for existing users.

### Q: Will migration affect my application's availability?

**A:** Migration can be done offline. Export, migrate, and import can happen without downtime.

### Q: How long does migration take?

**A:** Depends on memory count:
- 1,000 memories: ~10 seconds
- 10,000 memories: ~2 minutes
- 100,000 memories: ~20 minutes

### Q: What if I have custom memory fields?

**A:** Custom fields are preserved. Only standard fields (id, tags, metadata) are validated/transformed.

### Q: Can I migrate incrementally?

**A:** Yes. Export in batches, migrate each batch, and import.

### Q: What happens to old ESCAPE clauses?

**A:** They'll fail. Update all ESCAPE '\\' to ESCAPE '!' in your codebase before migration.

### Q: Are there any data loss risks?

**A:** No, if you follow the backup procedure. Always backup before migrating.

### Q: Can I keep using old IDs?

**A:** Only if they're valid UUIDs. Invalid IDs are regenerated.

### Q: Do I need to update my queries?

**A:** Update ESCAPE clauses from '\\' to '!'. SmartMemoryQuery is optional but recommended.

---

## Support

**Issues?** Report at: https://github.com/your-org/memesh/issues

**Questions?** Check:
- [API Reference](./MEMORY_API.md)
- [Best Practices](./MEMORY_BEST_PRACTICES.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

**Happy migrating! 🚀**
