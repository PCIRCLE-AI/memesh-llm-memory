#!/usr/bin/env tsx

/**
 * Memory Migration v2.0
 *
 * 遷移舊資料庫 (./data/knowledge-graph.db) 到新資料庫 (~/.claude-code-buddy/knowledge-graph.db)
 *
 * Features:
 * - 自動為舊資料加上 scope tags (scope:project:claude-code-buddy)
 * - 自動偵測技術棧並加上 tech tags
 * - 保留舊的 entity types (legacy types)
 * - 去重檢查 (跳過已存在的實體)
 * - 備份機制
 * - Dry-run 模式
 * - 詳細的遷移報告
 *
 * Usage:
 *   npm run migrate:memory -- --dry-run     # 預覽模式
 *   npm run migrate:memory                  # 實際執行
 *   npm run migrate:memory -- --no-backup   # 不備份舊資料庫
 */

import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { MemoryAutoTagger } from '../src/memory/MemoryAutoTagger.js';

interface MigrationOptions {
  dryRun?: boolean;
  backupOld?: boolean;
  projectName?: string;
  oldDbPath?: string;
  newDbPath?: string;
}

interface MigrationReport {
  totalEntities: number;
  migratedEntities: number;
  skippedEntities: number;
  addedTags: { entityName: string; tags: string[] }[];
  errors: { entityName: string; error: string }[];
  techStack: string[];
}

interface OldEntity {
  id: number;
  name: string;
  type: string;
  created_at: string;
  metadata: string | null;
}

interface OldObservation {
  content: string;
}

interface OldTag {
  tag: string;
}

/**
 * 備份舊資料庫
 */
async function backupDatabase(dbPath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupPath = `${dbPath}.backup-${timestamp}`;

  console.log(`📦 備份舊資料庫: ${dbPath} → ${backupPath}`);
  await fs.copyFile(dbPath, backupPath);
  console.log(`✅ 備份完成: ${backupPath}`);

  return backupPath;
}

/**
 * 讀取舊資料庫所有實體
 */
function readOldEntities(oldDb: Database.Database): OldEntity[] {
  const entities = oldDb.prepare(`
    SELECT id, name, type, created_at, metadata
    FROM entities
    ORDER BY created_at ASC
  `).all() as OldEntity[];

  return entities;
}

/**
 * 讀取實體的 observations
 */
function readObservations(oldDb: Database.Database, entityId: number): string[] {
  const rows = oldDb.prepare(`
    SELECT content
    FROM observations
    WHERE entity_id = ?
    ORDER BY created_at ASC
  `).all(entityId) as OldObservation[];

  return rows.map(row => row.content);
}

/**
 * 讀取實體的 tags
 */
function readTags(oldDb: Database.Database, entityId: number): string[] {
  const rows = oldDb.prepare(`
    SELECT tag
    FROM tags
    WHERE entity_id = ?
  `).all(entityId) as OldTag[];

  return rows.map(row => row.tag);
}

/**
 * 檢查實體是否已存在於新資料庫
 */
function entityExists(newDb: Database.Database, name: string): boolean {
  const result = newDb.prepare(`
    SELECT 1 FROM entities WHERE name = ?
  `).get(name);

  return !!result;
}

/**
 * 創建實體到新資料庫
 */
function createEntityInNewDb(
  newDb: Database.Database,
  name: string,
  entityType: string,
  observations: string[],
  tags: string[]
): void {
  newDb.transaction(() => {
    // Insert entity (使用 type 欄位，因為新資料庫使用舊 schema)
    newDb.prepare(`
      INSERT INTO entities (name, type)
      VALUES (?, ?)
    `).run(name, entityType);

    // Get the entity ID we just created
    const entity = newDb.prepare(`
      SELECT id FROM entities WHERE name = ?
    `).get(name) as { id: number };

    // Insert observations
    const insertObs = newDb.prepare(`
      INSERT INTO observations (entity_id, content)
      VALUES (?, ?)
    `);

    for (const observation of observations) {
      insertObs.run(entity.id, observation);
    }

    // Insert tags
    const insertTag = newDb.prepare(`
      INSERT INTO tags (entity_id, tag)
      VALUES (?, ?)
    `);

    for (const tag of tags) {
      insertTag.run(entity.id, tag);
    }
  })();
}

/**
 * 生成遷移標籤
 */
async function generateMigrationTags(
  projectName: string,
  techStack: string[],
  oldType: string,
  existingTags: string[]
): Promise<string[]> {
  const autoTagger = new MemoryAutoTagger();

  const tags: string[] = [
    ...existingTags,
    `scope:project:${projectName}`,
    `legacy:${oldType}`, // 標記為 legacy entity type
  ];

  // 添加技術棧 tags
  for (const tech of techStack) {
    tags.push(`tech:${tech}`);
  }

  // 正規化（去重、小寫）
  return autoTagger.normalizeTags(tags);
}

/**
 * 執行遷移
 */
async function migrateMemoryV2(options: MigrationOptions = {}): Promise<MigrationReport> {
  const {
    dryRun = false,
    backupOld = true,
    projectName = 'claude-code-buddy',
    oldDbPath = './data/knowledge-graph.db',
    newDbPath = path.join(os.homedir(), '.claude-code-buddy', 'knowledge-graph.db'),
  } = options;

  console.log('\n🚀 Memory Migration v2.0');
  console.log('='.repeat(50));
  console.log(`模式: ${dryRun ? 'DRY-RUN (預覽)' : 'LIVE (實際執行)'}`);
  console.log(`舊資料庫: ${oldDbPath}`);
  console.log(`新資料庫: ${newDbPath}`);
  console.log(`專案名稱: ${projectName}`);
  console.log('='.repeat(50) + '\n');

  // Step 1: 備份舊資料庫
  if (backupOld && !dryRun) {
    await backupDatabase(oldDbPath);
  }

  // Step 2: 開啟兩個資料庫
  console.log('📂 開啟資料庫連接...');
  const oldDb = new Database(oldDbPath, { readonly: true });
  const newDb = new Database(newDbPath);

  const report: MigrationReport = {
    totalEntities: 0,
    migratedEntities: 0,
    skippedEntities: 0,
    addedTags: [],
    errors: [],
    techStack: [],
  };

  try {
    // Step 3: 偵測技術棧
    console.log('🔍 偵測技術棧...');
    const autoTagger = new MemoryAutoTagger();
    const projectPath = process.cwd();
    const techStack = await autoTagger.detectTechStack(projectPath);
    report.techStack = techStack;

    console.log(`✅ 偵測到技術棧: ${techStack.join(', ')}`);

    // Step 4: 讀取舊資料庫所有實體
    console.log('\n📖 讀取舊資料庫...');
    const oldEntities = readOldEntities(oldDb);
    report.totalEntities = oldEntities.length;

    console.log(`✅ 找到 ${oldEntities.length} 個實體`);

    // Step 5: 遷移每個實體
    console.log('\n🔄 開始遷移...\n');

    for (const entity of oldEntities) {
      try {
        // 5a. 檢查是否已存在
        const exists = entityExists(newDb, entity.name);
        if (exists) {
          console.log(`⏭️  跳過 (已存在): ${entity.name}`);
          report.skippedEntities++;
          continue;
        }

        // 5b. 讀取 observations 和 tags
        const observations = readObservations(oldDb, entity.id);
        const existingTags = readTags(oldDb, entity.id);

        // 5c. 生成遷移 tags
        const tags = await generateMigrationTags(
          projectName,
          techStack,
          entity.type,
          existingTags
        );

        // 5d. 創建實體（除非 dry-run）
        if (!dryRun) {
          createEntityInNewDb(newDb, entity.name, entity.type, observations, tags);
        }

        console.log(`✅ ${dryRun ? '[預覽]' : '遷移'}: ${entity.name}`);
        console.log(`   類型: ${entity.type}`);
        console.log(`   Observations: ${observations.length} 條`);
        console.log(`   Tags: ${tags.join(', ')}`);
        console.log();

        report.migratedEntities++;
        report.addedTags.push({
          entityName: entity.name,
          tags,
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ 錯誤: ${entity.name} - ${errorMsg}`);
        report.errors.push({
          entityName: entity.name,
          error: errorMsg,
        });
      }
    }

    // Step 6: 產生報告
    console.log('\n' + '='.repeat(50));
    console.log('📊 遷移報告');
    console.log('='.repeat(50));
    console.log(`總實體數: ${report.totalEntities}`);
    console.log(`已遷移: ${report.migratedEntities}`);
    console.log(`已跳過: ${report.skippedEntities}`);
    console.log(`錯誤數: ${report.errors.length}`);
    console.log(`偵測技術棧: ${report.techStack.join(', ')}`);

    if (report.errors.length > 0) {
      console.log('\n❌ 錯誤詳情:');
      for (const err of report.errors) {
        console.log(`   - ${err.entityName}: ${err.error}`);
      }
    }

    if (dryRun) {
      console.log('\n⚠️  這是 DRY-RUN 模式，沒有實際修改資料庫');
      console.log('   執行 npm run migrate:memory 進行實際遷移');
    } else {
      console.log('\n✅ 遷移完成！');
    }

    console.log('='.repeat(50) + '\n');

  } finally {
    // Step 7: 關閉資料庫
    oldDb.close();
    newDb.close();
  }

  return report;
}

/**
 * CLI 介面
 */
async function main() {
  const args = process.argv.slice(2);

  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    backupOld: !args.includes('--no-backup'),
  };

  // 自訂專案名稱
  const projectNameArg = args.find(arg => arg.startsWith('--project='));
  if (projectNameArg) {
    options.projectName = projectNameArg.split('=')[1];
  }

  // 自訂舊資料庫路徑
  const oldDbArg = args.find(arg => arg.startsWith('--old-db='));
  if (oldDbArg) {
    options.oldDbPath = oldDbArg.split('=')[1];
  }

  // 自訂新資料庫路徑
  const newDbArg = args.find(arg => arg.startsWith('--new-db='));
  if (newDbArg) {
    options.newDbPath = newDbArg.split('=')[1];
  }

  try {
    const report = await migrateMemoryV2(options);

    // 儲存報告到檔案 (JSON)
    if (!options.dryRun) {
      const reportPath = './migration-report.json';
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 報告已儲存: ${reportPath}`);
    }

    // Exit code
    process.exit(report.errors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ 遷移失敗:', error);
    process.exit(1);
  }
}

// 執行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateMemoryV2, type MigrationOptions, type MigrationReport };
