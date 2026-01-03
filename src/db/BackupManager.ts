/**
 * Database Backup Manager
 *
 * Provides automated and manual backup functionality for SQLite databases
 * with compression, verification, and retention policies.
 *
 * Features:
 * - Automatic daily backups with configurable schedule
 * - Manual backup trigger via MCP tool
 * - Backup compression (gzip)
 * - Backup integrity verification
 * - Retention policy (7 daily + 4 weekly backups)
 * - Multiple database support
 */

import { promises as fs, existsSync, createReadStream, createWriteStream } from 'fs';
import { join, basename, dirname } from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

export interface BackupOptions {
  /**
   * Whether to compress the backup (default: true)
   */
  compress?: boolean;

  /**
   * Custom backup directory (default: data/backups)
   */
  backupDir?: string;

  /**
   * Whether to verify backup after creation (default: true)
   */
  verify?: boolean;

  /**
   * Custom backup filename prefix
   */
  prefix?: string;
}

export interface BackupInfo {
  /**
   * Timestamp when backup was created
   */
  timestamp: Date;

  /**
   * Full path to backup file
   */
  path: string;

  /**
   * Size of backup file in bytes
   */
  size: number;

  /**
   * Whether backup is compressed
   */
  compressed: boolean;

  /**
   * Whether backup has been verified
   */
  verified: boolean;

  /**
   * Original database name
   */
  dbName: string;

  /**
   * Checksum of backup file (SHA-256 hex)
   */
  checksum?: string;
}

export interface RetentionPolicy {
  /**
   * Number of daily backups to keep (default: 7)
   */
  dailyBackups: number;

  /**
   * Number of weekly backups to keep (default: 4)
   */
  weeklyBackups: number;

  /**
   * Number of monthly backups to keep (default: 12)
   */
  monthlyBackups?: number;
}

export class BackupManager {
  private readonly defaultBackupDir: string;
  private readonly defaultRetentionPolicy: RetentionPolicy = {
    dailyBackups: 7,
    weeklyBackups: 4,
    monthlyBackups: 12,
  };

  constructor(backupDir?: string) {
    this.defaultBackupDir = backupDir || join(process.cwd(), 'data', 'backups');
  }

  /**
   * Create a backup of a SQLite database
   *
   * @param dbPath - Path to the database file to backup
   * @param options - Backup options
   * @returns BackupInfo with details about the created backup
   *
   * @example
   * ```typescript
   * const manager = new BackupManager();
   * const backup = await manager.createBackup('data/knowledge-graph.db');
   * console.log(`Backup created: ${backup.path}`);
   * ```
   */
  async createBackup(dbPath: string, options: BackupOptions = {}): Promise<BackupInfo> {
    const startTime = Date.now();
    logger.info(`[BackupManager] Starting backup of ${dbPath}`);

    // Validate database exists
    if (!existsSync(dbPath)) {
      throw new Error(`Database not found: ${dbPath}`);
    }

    // Prepare backup options
    const compress = options.compress ?? true;
    const verify = options.verify ?? true;
    const backupDir = options.backupDir || this.defaultBackupDir;
    const prefix = options.prefix || '';

    // Create backup directory structure (YYYY-MM-DD format)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
    const timeStr = `${hours}-${minutes}-${seconds}-${milliseconds}`; // HH-MM-SS-mmm
    const dateDirPath = join(backupDir, dateStr);

    await fs.mkdir(dateDirPath, { recursive: true });

    // Generate backup filename
    const dbName = basename(dbPath, '.db');
    const backupFilename = `${prefix}${dbName}_${timeStr}${compress ? '.db.gz' : '.db'}`;
    const backupPath = join(dateDirPath, backupFilename);

    // Perform backup using SQLite VACUUM INTO (ensures consistency)
    await this.performVacuumBackup(dbPath, backupPath, compress);

    // Get backup file size
    const stats = await fs.stat(backupPath);
    const size = stats.size;

    // Calculate checksum
    const checksum = await this.calculateChecksum(backupPath);

    // Create backup info
    const backupInfo: BackupInfo = {
      timestamp: now,
      path: backupPath,
      size,
      compressed: compress,
      verified: false,
      dbName,
      checksum,
    };

    // Verify backup if requested
    if (verify) {
      const isValid = await this.verifyBackup(backupPath, compress);
      backupInfo.verified = isValid;

      if (!isValid) {
        logger.error(`[BackupManager] Backup verification failed: ${backupPath}`);
        throw new Error(`Backup verification failed: ${backupPath}`);
      }
    }

    const duration = Date.now() - startTime;
    logger.info(
      `[BackupManager] Backup completed: ${backupPath} (${this.formatBytes(size)}, ${duration}ms)`
    );

    return backupInfo;
  }

  /**
   * Perform database backup using VACUUM INTO
   *
   * This ensures a consistent backup even if the database is being written to
   */
  private async performVacuumBackup(
    dbPath: string,
    backupPath: string,
    compress: boolean
  ): Promise<void> {
    if (compress) {
      // Create temporary uncompressed backup
      const tempPath = backupPath.replace('.gz', '.tmp');

      try {
        // Use VACUUM INTO to create consistent backup
        const db = new Database(dbPath, { readonly: true });
        try {
          db.prepare(`VACUUM INTO ?`).run(tempPath);
        } finally {
          db.close();
        }

        // Compress the backup
        await this.compressFile(tempPath, backupPath);

        // Remove temporary file
        await fs.unlink(tempPath);
      } catch (error) {
        // Clean up temp file if it exists
        if (existsSync(tempPath)) {
          await fs.unlink(tempPath).catch(() => {
            /* ignore */
          });
        }
        throw error;
      }
    } else {
      // Direct VACUUM INTO without compression
      const db = new Database(dbPath, { readonly: true });
      try {
        db.prepare(`VACUUM INTO ?`).run(backupPath);
      } finally {
        db.close();
      }
    }
  }

  /**
   * Compress a file using gzip
   */
  private async compressFile(inputPath: string, outputPath: string): Promise<void> {
    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);
    const gzip = createGzip({ level: 9 }); // Maximum compression

    await pipeline(input, gzip, output);
  }

  /**
   * Decompress a gzip file
   */
  private async decompressFile(inputPath: string, outputPath: string): Promise<void> {
    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);
    const gunzip = createGunzip();

    await pipeline(input, gunzip, output);
  }

  /**
   * Calculate SHA-256 checksum of a file
   */
  private async calculateChecksum(filePath: string): Promise<string> {
    const { createHash } = await import('crypto');
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Verify backup integrity
   *
   * @param backupPath - Path to backup file
   * @param compressed - Whether backup is compressed
   * @returns true if backup is valid, false otherwise
   */
  async verifyBackup(backupPath: string, compressed: boolean = true): Promise<boolean> {
    try {
      logger.info(`[BackupManager] Verifying backup: ${backupPath}`);

      if (!existsSync(backupPath)) {
        logger.error(`[BackupManager] Backup file not found: ${backupPath}`);
        return false;
      }

      let tempDbPath = backupPath;

      // Decompress if needed
      if (compressed) {
        tempDbPath = backupPath.replace('.gz', '.verify.db');
        await this.decompressFile(backupPath, tempDbPath);
      }

      try {
        // Try to open the database
        const db = new Database(tempDbPath, { readonly: true });

        try {
          // Verify database integrity
          const result = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };

          if (result.integrity_check !== 'ok') {
            logger.error(`[BackupManager] Integrity check failed: ${result.integrity_check}`);
            return false;
          }

          // Verify we can read from the database
          const tableCount = db.prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`).get() as { count: number };

          logger.info(`[BackupManager] Backup verified: ${tableCount.count} tables found`);
          return true;
        } finally {
          db.close();
        }
      } finally {
        // Clean up temporary decompressed file
        if (compressed && existsSync(tempDbPath)) {
          await fs.unlink(tempDbPath);
        }
      }
    } catch (error) {
      logger.error(`[BackupManager] Backup verification error: ${error}`);
      return false;
    }
  }

  /**
   * List all available backups for a database
   *
   * @param dbPath - Path to the database file (or database name)
   * @returns Array of BackupInfo sorted by timestamp (newest first)
   */
  async listBackups(dbPath: string): Promise<BackupInfo[]> {
    const dbName = basename(dbPath, '.db');
    const backupDir = this.defaultBackupDir;

    if (!existsSync(backupDir)) {
      return [];
    }

    const backups: BackupInfo[] = [];

    // Scan all date directories
    const dateDirs = await fs.readdir(backupDir);

    for (const dateDir of dateDirs) {
      const dateDirPath = join(backupDir, dateDir);
      const stat = await fs.stat(dateDirPath);

      if (!stat.isDirectory()) continue;

      // Scan backup files in this date directory
      const files = await fs.readdir(dateDirPath);

      for (const file of files) {
        // Match backup files for this database
        if (file.includes(dbName) && (file.endsWith('.db') || file.endsWith('.db.gz'))) {
          const filePath = join(dateDirPath, file);
          const fileStats = await fs.stat(filePath);

          backups.push({
            timestamp: fileStats.mtime,
            path: filePath,
            size: fileStats.size,
            compressed: file.endsWith('.gz'),
            verified: false, // Not verified yet
            dbName,
          });
        }
      }
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return backups;
  }

  /**
   * Restore a database from backup
   *
   * @param backupPath - Path to backup file
   * @param targetPath - Path where database should be restored
   * @param options - Restore options
   * @returns true if restore successful
   *
   * @example
   * ```typescript
   * const manager = new BackupManager();
   * await manager.restoreBackup(
   *   'data/backups/2025-01-01/knowledge-graph_12-00-00.db.gz',
   *   'data/knowledge-graph.db'
   * );
   * ```
   */
  async restoreBackup(
    backupPath: string,
    targetPath: string,
    options: { verify?: boolean } = {}
  ): Promise<void> {
    logger.info(`[BackupManager] Restoring backup: ${backupPath} -> ${targetPath}`);

    // Verify backup exists
    if (!existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupPath}`);
    }

    const compressed = backupPath.endsWith('.gz');

    // Verify backup integrity first (if requested)
    if (options.verify !== false) {
      const isValid = await this.verifyBackup(backupPath, compressed);
      if (!isValid) {
        throw new Error(`Backup verification failed: ${backupPath}`);
      }
    }

    // Create target directory if needed
    const targetDir = dirname(targetPath);
    await fs.mkdir(targetDir, { recursive: true });

    // Create backup of current database if it exists
    if (existsSync(targetPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupBeforeRestore = `${targetPath}.before-restore-${timestamp}`;
      await fs.copyFile(targetPath, backupBeforeRestore);
      logger.info(`[BackupManager] Current database backed up to: ${backupBeforeRestore}`);
    }

    // Restore from backup
    if (compressed) {
      await this.decompressFile(backupPath, targetPath);
    } else {
      await fs.copyFile(backupPath, targetPath);
    }

    // Verify restored database
    const db = new Database(targetPath, { readonly: true });
    try {
      const result = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
      if (result.integrity_check !== 'ok') {
        throw new Error(`Restored database integrity check failed: ${result.integrity_check}`);
      }
    } finally {
      db.close();
    }

    logger.info(`[BackupManager] Restore completed successfully`);
  }

  /**
   * Clean old backups based on retention policy
   *
   * @param dbPath - Database path or name
   * @param policy - Retention policy (optional, uses default if not provided)
   * @returns Number of backups deleted
   */
  async cleanOldBackups(dbPath: string, policy?: RetentionPolicy): Promise<number> {
    const retentionPolicy = policy || this.defaultRetentionPolicy;
    const backups = await this.listBackups(dbPath);

    if (backups.length === 0) {
      return 0;
    }

    logger.info(
      `[BackupManager] Cleaning old backups for ${dbPath} (found ${backups.length} backups)`
    );

    const now = new Date();
    const backupsToKeep = new Set<string>();
    let deletedCount = 0;

    // Keep daily backups (last N days)
    const dailyBackups = backups.filter((b) => {
      const age = now.getTime() - b.timestamp.getTime();
      const days = age / (1000 * 60 * 60 * 24);
      return days < retentionPolicy.dailyBackups;
    });

    dailyBackups.forEach((b) => backupsToKeep.add(b.path));

    // Keep weekly backups (one per week for last N weeks)
    const weeklyBackups = this.selectWeeklyBackups(backups, retentionPolicy.weeklyBackups);
    weeklyBackups.forEach((b) => backupsToKeep.add(b.path));

    // Keep monthly backups if configured
    if (retentionPolicy.monthlyBackups) {
      const monthlyBackups = this.selectMonthlyBackups(backups, retentionPolicy.monthlyBackups);
      monthlyBackups.forEach((b) => backupsToKeep.add(b.path));
    }

    // Delete backups not in the keep set
    for (const backup of backups) {
      if (!backupsToKeep.has(backup.path)) {
        try {
          await fs.unlink(backup.path);
          deletedCount++;
          logger.info(`[BackupManager] Deleted old backup: ${backup.path}`);
        } catch (error) {
          logger.error(`[BackupManager] Failed to delete backup ${backup.path}: ${error}`);
        }
      }
    }

    // Clean up empty date directories
    await this.cleanEmptyDateDirectories();

    logger.info(
      `[BackupManager] Cleanup completed: ${deletedCount} backups deleted, ${backupsToKeep.size} kept`
    );

    return deletedCount;
  }

  /**
   * Select one backup per week for the last N weeks
   */
  private selectWeeklyBackups(backups: BackupInfo[], weeks: number): BackupInfo[] {
    const weeklyMap = new Map<string, BackupInfo>();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - weeks * 7);

    for (const backup of backups) {
      if (backup.timestamp < cutoffDate) continue;

      // Get week identifier (ISO week)
      const weekKey = this.getISOWeek(backup.timestamp);

      // Keep the newest backup for each week
      const existing = weeklyMap.get(weekKey);
      if (!existing || backup.timestamp > existing.timestamp) {
        weeklyMap.set(weekKey, backup);
      }
    }

    return Array.from(weeklyMap.values());
  }

  /**
   * Select one backup per month for the last N months
   */
  private selectMonthlyBackups(backups: BackupInfo[], months: number): BackupInfo[] {
    const monthlyMap = new Map<string, BackupInfo>();
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);

    for (const backup of backups) {
      if (backup.timestamp < cutoffDate) continue;

      // Get month identifier (YYYY-MM)
      const monthKey = `${backup.timestamp.getFullYear()}-${String(backup.timestamp.getMonth() + 1).padStart(2, '0')}`;

      // Keep the newest backup for each month
      const existing = monthlyMap.get(monthKey);
      if (!existing || backup.timestamp > existing.timestamp) {
        monthlyMap.set(monthKey, backup);
      }
    }

    return Array.from(monthlyMap.values());
  }

  /**
   * Get ISO week number for a date
   */
  private getISOWeek(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  /**
   * Clean up empty date directories
   */
  private async cleanEmptyDateDirectories(): Promise<void> {
    const backupDir = this.defaultBackupDir;

    if (!existsSync(backupDir)) return;

    const dateDirs = await fs.readdir(backupDir);

    for (const dateDir of dateDirs) {
      const dateDirPath = join(backupDir, dateDir);
      const stat = await fs.stat(dateDirPath);

      if (!stat.isDirectory()) continue;

      const files = await fs.readdir(dateDirPath);

      if (files.length === 0) {
        await fs.rmdir(dateDirPath);
        logger.info(`[BackupManager] Removed empty directory: ${dateDirPath}`);
      }
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Get backup statistics
   */
  async getBackupStats(dbPath: string): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup: Date | null;
    newestBackup: Date | null;
    averageSize: number;
  }> {
    const backups = await this.listBackups(dbPath);

    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        oldestBackup: null,
        newestBackup: null,
        averageSize: 0,
      };
    }

    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    const oldest = backups[backups.length - 1];
    const newest = backups[0];

    return {
      totalBackups: backups.length,
      totalSize,
      oldestBackup: oldest.timestamp,
      newestBackup: newest.timestamp,
      averageSize: totalSize / backups.length,
    };
  }
}
