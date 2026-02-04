#!/usr/bin/env tsx

/**
 * Migration Verification Script
 *
 * Verifies whether migration completed successfully
 */

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

interface VerificationResult {
  success: boolean;
  checks: {
    name: string;
    passed: boolean;
    details?: string;
  }[];
}

async function verifyMigration(): Promise<VerificationResult> {
  const oldDbPath = './data/knowledge-graph.db';
  const newDbPath = path.join(os.homedir(), '.claude-code-buddy', 'knowledge-graph.db');

  console.log('\n🔍 Verifying Migration Results');
  console.log('='.repeat(50));

  const result: VerificationResult = {
    success: true,
    checks: [],
  };

  try {
    // Open databases
    const oldDb = new Database(oldDbPath, { readonly: true });
    const newDb = new Database(newDbPath, { readonly: true });

    // Check 1: Total entity count
    const oldCount = (oldDb.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number }).count;
    const newCount = (newDb.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number }).count;

    const entityCountCheck = {
      name: 'Total entity count',
      passed: newCount >= oldCount,
      details: `Old DB: ${oldCount}, New DB: ${newCount}`,
    };
    result.checks.push(entityCountCheck);

    // Check 2: All old entities exist in new database
    const oldEntities = oldDb.prepare('SELECT name FROM entities').all() as { name: string }[];
    let missingEntities = 0;

    for (const entity of oldEntities) {
      const exists = newDb.prepare('SELECT 1 FROM entities WHERE name = ?').get(entity.name);
      if (!exists) {
        missingEntities++;
        console.log(chalk.red(`   ❌ Missing entity: ${entity.name}`));
      }
    }

    const allEntitiesMigrated = {
      name: 'All entities migrated',
      passed: missingEntities === 0,
      details: `Missing ${missingEntities} entities`,
    };
    result.checks.push(allEntitiesMigrated);

    // Check 3: Check if migrated entities have tags
    // Note: Only check entities migrated from old database
    const migratedEntityNames = oldEntities.map(e => e.name);
    let entitiesWithoutTags = 0;

    for (const entityName of migratedEntityNames) {
      interface TagCount {
        count: number;
      }

      const tagCount = (newDb.prepare(`
        SELECT COUNT(*) as count
        FROM tags t
        JOIN entities e ON t.entity_id = e.id
        WHERE e.name = ?
      `).get(entityName) as TagCount | undefined)?.count || 0;

      if (tagCount === 0) {
        entitiesWithoutTags++;
        console.log(chalk.yellow(`   ⚠️  Entity without tags: ${entityName}`));
      }
    }

    const allHaveTags = {
      name: 'Migrated entities have tags',
      passed: entitiesWithoutTags === 0,
      details: `${entitiesWithoutTags} entities without tags`,
    };
    result.checks.push(allHaveTags);

    // Check 4: Check scope tags
    interface ScopeTagCount {
      count: number;
    }

    const scopeTagCount = (newDb.prepare(`
      SELECT COUNT(*) as count
      FROM tags
      WHERE tag LIKE 'scope:%'
    `).get() as ScopeTagCount).count;

    const hasScopeTags = {
      name: 'Scope tags added',
      passed: scopeTagCount > 0,
      details: `Found ${scopeTagCount} scope tags`,
    };
    result.checks.push(hasScopeTags);

    // Check 5: Check tech tags
    interface TechTagCount {
      count: number;
    }

    const techTagCount = (newDb.prepare(`
      SELECT COUNT(*) as count
      FROM tags
      WHERE tag LIKE 'tech:%'
    `).get() as TechTagCount).count;

    const hasTechTags = {
      name: 'Tech tags added',
      passed: techTagCount > 0,
      details: `Found ${techTagCount} tech tags`,
    };
    result.checks.push(hasTechTags);

    // Check 6: Observations preserved
    const oldObsCount = (oldDb.prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number }).count;
    const newObsCount = (newDb.prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number }).count;

    const observationsPreserved = {
      name: 'Observations preserved',
      passed: newObsCount >= oldObsCount,
      details: `Old: ${oldObsCount}, New: ${newObsCount}`,
    };
    result.checks.push(observationsPreserved);

    // Close databases
    oldDb.close();
    newDb.close();

    // Determine overall result
    result.success = result.checks.every(check => check.passed);

  } catch (error) {
    console.error(chalk.red('\n❌ Error occurred during verification:'), error);
    result.success = false;
  }

  // Output results
  console.log('\nCheck Results:');
  console.log('-'.repeat(50));

  for (const check of result.checks) {
    const icon = check.passed ? chalk.green('✅') : chalk.red('❌');
    console.log(`${icon} ${check.name}: ${check.details || (check.passed ? 'Passed' : 'Failed')}`);
  }

  console.log('-'.repeat(50));

  if (result.success) {
    console.log(chalk.green('\n✅ All checks passed! Migration completed successfully.\n'));
  } else {
    console.log(chalk.red('\n❌ Some checks failed, please review the migration process.\n'));
  }

  return result;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyMigration().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

export { verifyMigration };
