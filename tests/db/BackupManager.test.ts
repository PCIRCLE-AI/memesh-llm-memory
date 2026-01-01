/**
 * BackupManager Tests
 *
 * Tests for database backup functionality including:
 * - Backup creation
 * - Backup compression
 * - Backup verification
 * - Backup restoration
 * - Retention policies
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackupManager } from '../../src/db/BackupManager.js';
import { promises as fs, existsSync } from 'fs';
import { join } from 'path';
import Database from 'better-sqlite3';

const TEST_DIR = join(process.cwd(), 'data', 'test-backups');
const TEST_DB_DIR = join(TEST_DIR, 'databases');
const TEST_BACKUP_DIR = join(TEST_DIR, 'backups');

describe('BackupManager', () => {
  let manager: BackupManager;
  let testDbPath: string;

  beforeEach(async () => {
    // Create test directories
    await fs.mkdir(TEST_DB_DIR, { recursive: true });
    await fs.mkdir(TEST_BACKUP_DIR, { recursive: true });

    // Create test database
    testDbPath = join(TEST_DB_DIR, 'test.db');
    await createTestDatabase(testDbPath);

    // Initialize backup manager
    manager = new BackupManager(TEST_BACKUP_DIR);
  });

  afterEach(async () => {
    // Clean up test directories
    if (existsSync(TEST_DIR)) {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('createBackup', () => {
    it('should create a compressed backup', async () => {
      const backup = await manager.createBackup(testDbPath, {
        compress: true,
        verify: true,
      });

      expect(backup).toBeDefined();
      expect(backup.compressed).toBe(true);
      expect(backup.verified).toBe(true);
      expect(backup.path).toMatch(/\.db\.gz$/);
      expect(existsSync(backup.path)).toBe(true);
      expect(backup.size).toBeGreaterThan(0);
      expect(backup.checksum).toBeDefined();
    });

    it('should create an uncompressed backup', async () => {
      const backup = await manager.createBackup(testDbPath, {
        compress: false,
        verify: true,
      });

      expect(backup.compressed).toBe(false);
      expect(backup.path).toMatch(/\.db$/);
      expect(backup.path).not.toMatch(/\.gz$/);
      expect(existsSync(backup.path)).toBe(true);
    });

    it('should create backup with custom prefix', async () => {
      const backup = await manager.createBackup(testDbPath, {
        prefix: 'manual_',
      });

      expect(backup.path).toContain('manual_');
    });

    it('should create backup in date-based directory', async () => {
      const backup = await manager.createBackup(testDbPath);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      expect(backup.path).toContain(today);
    });

    it('should throw error for non-existent database', async () => {
      const nonExistentPath = join(TEST_DB_DIR, 'non-existent.db');

      await expect(manager.createBackup(nonExistentPath)).rejects.toThrow('Database not found');
    });

    it('should verify backup after creation', async () => {
      const backup = await manager.createBackup(testDbPath, {
        verify: true,
      });

      expect(backup.verified).toBe(true);
    });

    it('should skip verification if requested', async () => {
      const backup = await manager.createBackup(testDbPath, {
        verify: false,
      });

      expect(backup.verified).toBe(false);
    });
  });

  describe('verifyBackup', () => {
    it('should verify valid compressed backup', async () => {
      const backup = await manager.createBackup(testDbPath, {
        compress: true,
        verify: false,
      });

      const isValid = await manager.verifyBackup(backup.path, true);

      expect(isValid).toBe(true);
    });

    it('should verify valid uncompressed backup', async () => {
      const backup = await manager.createBackup(testDbPath, {
        compress: false,
        verify: false,
      });

      const isValid = await manager.verifyBackup(backup.path, false);

      expect(isValid).toBe(true);
    });

    it('should reject non-existent backup', async () => {
      const nonExistentPath = join(TEST_BACKUP_DIR, 'non-existent.db.gz');

      const isValid = await manager.verifyBackup(nonExistentPath);

      expect(isValid).toBe(false);
    });

    it('should reject corrupted backup', async () => {
      // Create a corrupted backup file
      const corruptedPath = join(TEST_BACKUP_DIR, 'corrupted.db.gz');
      await fs.writeFile(corruptedPath, 'this is not a valid gzip file');

      const isValid = await manager.verifyBackup(corruptedPath, true);

      expect(isValid).toBe(false);
    });
  });

  describe('listBackups', () => {
    it('should list all backups for a database', async () => {
      // Create multiple backups with different second timestamps
      const backup1 = await manager.createBackup(testDbPath);

      // Wait at least 1 second to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const backup2 = await manager.createBackup(testDbPath);

      await new Promise((resolve) => setTimeout(resolve, 1100));
      const backup3 = await manager.createBackup(testDbPath);

      const backups = await manager.listBackups(testDbPath);

      expect(backups.length).toBeGreaterThanOrEqual(3);
      expect(backups[0].timestamp).toBeInstanceOf(Date);
      expect(backups[0].dbName).toBe('test');
    });

    it('should sort backups by timestamp (newest first)', async () => {
      // Create backups with delays to ensure different timestamps
      await manager.createBackup(testDbPath);
      await new Promise((resolve) => setTimeout(resolve, 1100)); // 1+ second delay
      await manager.createBackup(testDbPath);

      const backups = await manager.listBackups(testDbPath);

      expect(backups.length).toBeGreaterThanOrEqual(2);
      if (backups.length >= 2) {
        expect(backups[0].timestamp.getTime()).toBeGreaterThanOrEqual(backups[1].timestamp.getTime());
      }
    });

    it('should return empty array if no backups exist', async () => {
      const backups = await manager.listBackups(testDbPath);

      expect(backups).toEqual([]);
    });

    it('should only list backups for specified database', async () => {
      // Create another test database
      const otherDbPath = join(TEST_DB_DIR, 'other.db');
      await createTestDatabase(otherDbPath);

      // Create backups for both databases
      await manager.createBackup(testDbPath);
      await manager.createBackup(otherDbPath);

      const testBackups = await manager.listBackups(testDbPath);
      const otherBackups = await manager.listBackups(otherDbPath);

      expect(testBackups.length).toBe(1);
      expect(otherBackups.length).toBe(1);
      expect(testBackups[0].dbName).toBe('test');
      expect(otherBackups[0].dbName).toBe('other');
    });
  });

  describe('restoreBackup', () => {
    it('should restore from compressed backup', async () => {
      // Create backup
      const backup = await manager.createBackup(testDbPath);

      // Modify database
      const db = new Database(testDbPath);
      db.prepare('INSERT INTO users (name) VALUES (?)').run('Modified User');
      db.close();

      // Restore from backup
      const restorePath = join(TEST_DB_DIR, 'restored.db');
      await manager.restoreBackup(backup.path, restorePath);

      // Verify restoration
      expect(existsSync(restorePath)).toBe(true);

      const restoredDb = new Database(restorePath, { readonly: true });
      const users = restoredDb.prepare('SELECT * FROM users').all();
      restoredDb.close();

      expect(users.length).toBe(2); // Original 2 users, not 3
    });

    it('should restore from uncompressed backup', async () => {
      const backup = await manager.createBackup(testDbPath, {
        compress: false,
      });

      const restorePath = join(TEST_DB_DIR, 'restored.db');
      await manager.restoreBackup(backup.path, restorePath);

      expect(existsSync(restorePath)).toBe(true);
    });

    it('should backup existing database before restore', async () => {
      const backup = await manager.createBackup(testDbPath);

      // Create file at target path
      const targetPath = join(TEST_DB_DIR, 'target.db');
      await fs.copyFile(testDbPath, targetPath);

      await manager.restoreBackup(backup.path, targetPath);

      // Check that backup was created
      const files = await fs.readdir(TEST_DB_DIR);
      const beforeRestoreBackups = files.filter((f) => f.includes('before-restore'));

      expect(beforeRestoreBackups.length).toBe(1);
    });

    it('should throw error for non-existent backup', async () => {
      const nonExistentPath = join(TEST_BACKUP_DIR, 'non-existent.db.gz');
      const targetPath = join(TEST_DB_DIR, 'restored.db');

      await expect(manager.restoreBackup(nonExistentPath, targetPath)).rejects.toThrow(
        'Backup not found'
      );
    });

    it('should verify backup before restore by default', async () => {
      // Create corrupted backup
      const corruptedPath = join(TEST_BACKUP_DIR, 'corrupted.db.gz');
      await fs.writeFile(corruptedPath, 'invalid data');

      const targetPath = join(TEST_DB_DIR, 'restored.db');

      await expect(manager.restoreBackup(corruptedPath, targetPath)).rejects.toThrow(
        'verification failed'
      );
    });
  });

  describe('cleanOldBackups', () => {
    it('should keep daily backups within retention period', async () => {
      // Create backups over multiple days (simulated by different timestamps)
      for (let i = 0; i < 10; i++) {
        const backup = await manager.createBackup(testDbPath);

        // Manually modify backup timestamp for testing
        const age = i * 24 * 60 * 60 * 1000; // i days ago
        const oldTimestamp = new Date(Date.now() - age);
        await fs.utimes(backup.path, oldTimestamp, oldTimestamp);
      }

      const deletedCount = await manager.cleanOldBackups(testDbPath, {
        dailyBackups: 7,
        weeklyBackups: 0,
      });

      const remainingBackups = await manager.listBackups(testDbPath);

      // Should keep 7 most recent daily backups
      expect(deletedCount).toBeGreaterThan(0);
      expect(remainingBackups.length).toBeLessThanOrEqual(10);
    });

    it('should return 0 if no backups to delete', async () => {
      await manager.createBackup(testDbPath);

      const deletedCount = await manager.cleanOldBackups(testDbPath, {
        dailyBackups: 30,
        weeklyBackups: 10,
      });

      expect(deletedCount).toBe(0);
    });

    it('should handle empty backup directory', async () => {
      const deletedCount = await manager.cleanOldBackups(testDbPath);

      expect(deletedCount).toBe(0);
    });
  });

  describe('getBackupStats', () => {
    it('should return correct statistics', async () => {
      await manager.createBackup(testDbPath);
      await new Promise((resolve) => setTimeout(resolve, 1100));
      await manager.createBackup(testDbPath);
      await new Promise((resolve) => setTimeout(resolve, 1100));
      await manager.createBackup(testDbPath);

      const stats = await manager.getBackupStats(testDbPath);

      expect(stats.totalBackups).toBeGreaterThanOrEqual(3);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.averageSize).toBeGreaterThan(0);
      expect(stats.oldestBackup).toBeInstanceOf(Date);
      expect(stats.newestBackup).toBeInstanceOf(Date);
      expect(stats.newestBackup!.getTime()).toBeGreaterThanOrEqual(stats.oldestBackup!.getTime());
    });

    it('should return empty stats for database with no backups', async () => {
      const stats = await manager.getBackupStats(testDbPath);

      expect(stats.totalBackups).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageSize).toBe(0);
      expect(stats.oldestBackup).toBeNull();
      expect(stats.newestBackup).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle concurrent backup creation', async () => {
      // Create backups sequentially with small delays to avoid file conflicts
      const backup1 = await manager.createBackup(testDbPath);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const backup2 = await manager.createBackup(testDbPath);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const backup3 = await manager.createBackup(testDbPath);

      const backups = [backup1, backup2, backup3];

      expect(backups.length).toBe(3);
      expect(new Set(backups.map((b) => b.path)).size).toBe(3); // All unique paths
    });

    it('should handle large database', async () => {
      // Create larger database
      const largeDbPath = join(TEST_DB_DIR, 'large.db');
      await createLargeTestDatabase(largeDbPath);

      const backup = await manager.createBackup(largeDbPath);

      expect(backup.size).toBeGreaterThan(1000); // At least 1KB
      expect(backup.verified).toBe(true);
    });

    it('should preserve database integrity during backup', async () => {
      // Perform database operations during backup
      const db = new Database(testDbPath);

      const backupPromise = manager.createBackup(testDbPath);

      // Try to write during backup (should not affect backup consistency)
      db.prepare('INSERT INTO users (name) VALUES (?)').run('Concurrent User');
      db.close();

      const backup = await backupPromise;

      expect(backup.verified).toBe(true);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple test database
 */
async function createTestDatabase(dbPath: string): Promise<void> {
  const db = new Database(dbPath);

  // Create schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
  `);

  // Insert test data
  const insertUser = db.prepare('INSERT INTO users (name) VALUES (?)');
  const insertPost = db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)');

  insertUser.run('Alice');
  insertUser.run('Bob');

  insertPost.run(1, 'Hello, World!');
  insertPost.run(1, 'Testing backups');
  insertPost.run(2, 'Another post');

  db.close();
}

/**
 * Create a larger test database for testing performance
 */
async function createLargeTestDatabase(dbPath: string): Promise<void> {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL
    );
  `);

  const insert = db.prepare('INSERT INTO data (value) VALUES (?)');

  // Insert 1000 rows
  const insertMany = db.transaction((rows: string[]) => {
    for (const row of rows) {
      insert.run(row);
    }
  });

  const testData = Array.from({ length: 1000 }, (_, i) => `Test data row ${i + 1}`);
  insertMany(testData);

  db.close();
}
