#!/usr/bin/env tsx

/**
 * Migration Verification Script
 *
 * 驗證遷移是否成功完成
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

  console.log('\n🔍 驗證遷移結果');
  console.log('='.repeat(50));

  const result: VerificationResult = {
    success: true,
    checks: [],
  };

  try {
    // 開啟資料庫
    const oldDb = new Database(oldDbPath, { readonly: true });
    const newDb = new Database(newDbPath, { readonly: true });

    // Check 1: 實體總數
    const oldCount = (oldDb.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number }).count;
    const newCount = (newDb.prepare('SELECT COUNT(*) as count FROM entities').get() as { count: number }).count;

    const entityCountCheck = {
      name: '實體總數',
      passed: newCount >= oldCount,
      details: `舊資料庫: ${oldCount}, 新資料庫: ${newCount}`,
    };
    result.checks.push(entityCountCheck);

    // Check 2: 所有舊實體都存在於新資料庫
    const oldEntities = oldDb.prepare('SELECT name FROM entities').all() as { name: string }[];
    let missingEntities = 0;

    for (const entity of oldEntities) {
      const exists = newDb.prepare('SELECT 1 FROM entities WHERE name = ?').get(entity.name);
      if (!exists) {
        missingEntities++;
        console.log(chalk.red(`   ❌ 缺少實體: ${entity.name}`));
      }
    }

    const allEntitiesMigrated = {
      name: '所有實體已遷移',
      passed: missingEntities === 0,
      details: `缺少 ${missingEntities} 個實體`,
    };
    result.checks.push(allEntitiesMigrated);

    // Check 3: 檢查遷移的實體是否有 tags
    // 注意：只檢查從舊資料庫遷移過來的實體
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
        console.log(chalk.yellow(`   ⚠️  實體無 tags: ${entityName}`));
      }
    }

    const allHaveTags = {
      name: '遷移的實體都有 tags',
      passed: entitiesWithoutTags === 0,
      details: `${entitiesWithoutTags} 個實體沒有 tags`,
    };
    result.checks.push(allHaveTags);

    // Check 4: 檢查 scope tags
    interface ScopeTagCount {
      count: number;
    }

    const scopeTagCount = (newDb.prepare(`
      SELECT COUNT(*) as count
      FROM tags
      WHERE tag LIKE 'scope:%'
    `).get() as ScopeTagCount).count;

    const hasScopeTags = {
      name: 'Scope tags 已添加',
      passed: scopeTagCount > 0,
      details: `找到 ${scopeTagCount} 個 scope tags`,
    };
    result.checks.push(hasScopeTags);

    // Check 5: 檢查 tech tags
    interface TechTagCount {
      count: number;
    }

    const techTagCount = (newDb.prepare(`
      SELECT COUNT(*) as count
      FROM tags
      WHERE tag LIKE 'tech:%'
    `).get() as TechTagCount).count;

    const hasTechTags = {
      name: 'Tech tags 已添加',
      passed: techTagCount > 0,
      details: `找到 ${techTagCount} 個 tech tags`,
    };
    result.checks.push(hasTechTags);

    // Check 6: Observations 保留
    const oldObsCount = (oldDb.prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number }).count;
    const newObsCount = (newDb.prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number }).count;

    const observationsPreserved = {
      name: 'Observations 已保留',
      passed: newObsCount >= oldObsCount,
      details: `舊: ${oldObsCount}, 新: ${newObsCount}`,
    };
    result.checks.push(observationsPreserved);

    // 關閉資料庫
    oldDb.close();
    newDb.close();

    // 判斷總體結果
    result.success = result.checks.every(check => check.passed);

  } catch (error) {
    console.error(chalk.red('\n❌ 驗證過程發生錯誤:'), error);
    result.success = false;
  }

  // 輸出結果
  console.log('\n檢查結果:');
  console.log('-'.repeat(50));

  for (const check of result.checks) {
    const icon = check.passed ? chalk.green('✅') : chalk.red('❌');
    console.log(`${icon} ${check.name}: ${check.details || (check.passed ? '通過' : '失敗')}`);
  }

  console.log('-'.repeat(50));

  if (result.success) {
    console.log(chalk.green('\n✅ 所有檢查通過！遷移成功完成。\n'));
  } else {
    console.log(chalk.red('\n❌ 部分檢查失敗，請檢查遷移過程。\n'));
  }

  return result;
}

// CLI 介面
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyMigration().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

export { verifyMigration };
