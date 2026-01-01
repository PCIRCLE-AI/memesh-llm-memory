/**
 * MCP Tools for Database Backup Management
 *
 * Provides tools for creating, listing, restoring, and managing database backups.
 */

import { z } from 'zod';
import { join } from 'path';
import type { ResponseFormatter } from '../../ui/ResponseFormatter.js';
import { BackupManager } from '../../db/BackupManager.js';
import { logger } from '../../utils/logger.js';

// ============================================================================
// Input Schemas
// ============================================================================

export const CreateBackupInputSchema = z.object({
  dbPath: z
    .string()
    .optional()
    .describe(
      'Path to database file (default: data/knowledge-graph.db). Supports: knowledge-graph.db, evolution.db, collaboration.db'
    ),
  compress: z.boolean().optional().default(true).describe('Whether to compress backup (default: true)'),
  verify: z.boolean().optional().default(true).describe('Whether to verify backup after creation (default: true)'),
  prefix: z.string().optional().describe('Optional prefix for backup filename'),
});

export const ListBackupsInputSchema = z.object({
  dbPath: z
    .string()
    .optional()
    .describe('Path to database file (default: data/knowledge-graph.db)'),
});

export const RestoreBackupInputSchema = z.object({
  backupPath: z.string().describe('Path to backup file to restore'),
  targetPath: z
    .string()
    .optional()
    .describe('Target path for restored database (default: original database path)'),
  verify: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to verify backup before restore (default: true)'),
});

export const CleanBackupsInputSchema = z.object({
  dbPath: z
    .string()
    .optional()
    .describe('Path to database file (default: data/knowledge-graph.db)'),
  dailyBackups: z
    .number()
    .optional()
    .default(7)
    .describe('Number of daily backups to keep (default: 7)'),
  weeklyBackups: z
    .number()
    .optional()
    .default(4)
    .describe('Number of weekly backups to keep (default: 4)'),
  monthlyBackups: z
    .number()
    .optional()
    .default(12)
    .describe('Number of monthly backups to keep (default: 12)'),
});

export const BackupStatsInputSchema = z.object({
  dbPath: z
    .string()
    .optional()
    .describe('Path to database file (default: data/knowledge-graph.db)'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type ValidatedCreateBackupInput = z.infer<typeof CreateBackupInputSchema>;
export type ValidatedListBackupsInput = z.infer<typeof ListBackupsInputSchema>;
export type ValidatedRestoreBackupInput = z.infer<typeof RestoreBackupInputSchema>;
export type ValidatedCleanBackupsInput = z.infer<typeof CleanBackupsInputSchema>;
export type ValidatedBackupStatsInput = z.infer<typeof BackupStatsInputSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve database path from shorthand or full path
 */
function resolveDbPath(dbPath?: string): string {
  if (!dbPath) {
    return join(process.cwd(), 'data', 'knowledge-graph.db');
  }

  // If it's just a database name, resolve to data directory
  if (!dbPath.includes('/') && !dbPath.includes('\\')) {
    return join(process.cwd(), 'data', dbPath.endsWith('.db') ? dbPath : `${dbPath}.db`);
  }

  return dbPath;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
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
 * Format date to readable string
 */
function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * create_database_backup - Create a manual database backup
 *
 * Creates a compressed, verified backup of a SQLite database.
 *
 * @example
 * ```typescript
 * // Backup default database (knowledge-graph.db)
 * await executeCreateBackup({}, formatter);
 *
 * // Backup specific database
 * await executeCreateBackup({ dbPath: 'evolution.db' }, formatter);
 *
 * // Uncompressed backup
 * await executeCreateBackup({ compress: false }, formatter);
 * ```
 */
export async function executeCreateBackup(
  input: ValidatedCreateBackupInput,
  formatter: ResponseFormatter
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const dbPath = resolveDbPath(input.dbPath);
    const manager = new BackupManager();

    logger.info(`[DatabaseBackup] Creating backup for: ${dbPath}`);

    const backupInfo = await manager.createBackup(dbPath, {
      compress: input.compress,
      verify: input.verify,
      prefix: input.prefix,
    });

    const result = {
      success: true,
      backup: {
        path: backupInfo.path,
        size: formatBytes(backupInfo.size),
        compressed: backupInfo.compressed,
        verified: backupInfo.verified,
        checksum: backupInfo.checksum,
        timestamp: formatDate(backupInfo.timestamp),
      },
      database: dbPath,
    };

    const formattedResponse = formatter.format({
      agentType: 'database-backup',
      taskDescription: `Create backup of ${dbPath}`,
      status: 'success',
      results: result,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    const formattedError = formatter.format({
      agentType: 'database-backup',
      taskDescription: `Create backup of ${input.dbPath || 'default database'}`,
      status: 'error',
      error: errorObj,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedError,
        },
      ],
    };
  }
}

/**
 * list_database_backups - List all available backups for a database
 *
 * @example
 * ```typescript
 * await executeListBackups({}, formatter);
 * await executeListBackups({ dbPath: 'evolution.db' }, formatter);
 * ```
 */
export async function executeListBackups(
  input: ValidatedListBackupsInput,
  formatter: ResponseFormatter
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const dbPath = resolveDbPath(input.dbPath);
    const manager = new BackupManager();

    logger.info(`[DatabaseBackup] Listing backups for: ${dbPath}`);

    const backups = await manager.listBackups(dbPath);
    const stats = await manager.getBackupStats(dbPath);

    const result = {
      database: dbPath,
      totalBackups: backups.length,
      totalSize: formatBytes(stats.totalSize),
      oldestBackup: stats.oldestBackup ? formatDate(stats.oldestBackup) : null,
      newestBackup: stats.newestBackup ? formatDate(stats.newestBackup) : null,
      backups: backups.map((b) => ({
        path: b.path,
        size: formatBytes(b.size),
        compressed: b.compressed,
        timestamp: formatDate(b.timestamp),
      })),
    };

    const formattedResponse = formatter.format({
      agentType: 'database-backup',
      taskDescription: `List backups for ${dbPath}`,
      status: 'success',
      results: result,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    const formattedError = formatter.format({
      agentType: 'database-backup',
      taskDescription: `List backups for ${input.dbPath || 'default database'}`,
      status: 'error',
      error: errorObj,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedError,
        },
      ],
    };
  }
}

/**
 * restore_database_backup - Restore database from a backup
 *
 * IMPORTANT: This will backup the current database before restoring.
 *
 * @example
 * ```typescript
 * await executeRestoreBackup({
 *   backupPath: 'data/backups/2025-01-01/knowledge-graph_12-00-00.db.gz'
 * }, formatter);
 * ```
 */
export async function executeRestoreBackup(
  input: ValidatedRestoreBackupInput,
  formatter: ResponseFormatter
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const manager = new BackupManager();

    logger.info(`[DatabaseBackup] Restoring from backup: ${input.backupPath}`);

    // Determine target path
    let targetPath = input.targetPath;
    if (!targetPath) {
      // Extract database name from backup path and restore to data directory
      const backupFilename = input.backupPath.split('/').pop() || '';
      const dbName = backupFilename.split('_')[0];
      targetPath = join(process.cwd(), 'data', `${dbName}.db`);
    }

    await manager.restoreBackup(input.backupPath, targetPath, {
      verify: input.verify,
    });

    const result = {
      success: true,
      restoredFrom: input.backupPath,
      restoredTo: targetPath,
      verified: input.verify,
    };

    const formattedResponse = formatter.format({
      agentType: 'database-backup',
      taskDescription: `Restore database from ${input.backupPath}`,
      status: 'success',
      results: result,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    const formattedError = formatter.format({
      agentType: 'database-backup',
      taskDescription: `Restore database from ${input.backupPath}`,
      status: 'error',
      error: errorObj,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedError,
        },
      ],
    };
  }
}

/**
 * clean_database_backups - Clean old backups based on retention policy
 *
 * Keeps:
 * - Daily backups for last N days (default: 7)
 * - Weekly backups for last N weeks (default: 4)
 * - Monthly backups for last N months (default: 12)
 *
 * @example
 * ```typescript
 * // Use default retention policy (7 daily, 4 weekly, 12 monthly)
 * await executeCleanBackups({}, formatter);
 *
 * // Custom retention policy
 * await executeCleanBackups({
 *   dailyBackups: 14,
 *   weeklyBackups: 8,
 *   monthlyBackups: 24
 * }, formatter);
 * ```
 */
export async function executeCleanBackups(
  input: ValidatedCleanBackupsInput,
  formatter: ResponseFormatter
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const dbPath = resolveDbPath(input.dbPath);
    const manager = new BackupManager();

    logger.info(`[DatabaseBackup] Cleaning old backups for: ${dbPath}`);

    const deletedCount = await manager.cleanOldBackups(dbPath, {
      dailyBackups: input.dailyBackups,
      weeklyBackups: input.weeklyBackups,
      monthlyBackups: input.monthlyBackups,
    });

    const result = {
      success: true,
      database: dbPath,
      deletedBackups: deletedCount,
      retentionPolicy: {
        dailyBackups: input.dailyBackups,
        weeklyBackups: input.weeklyBackups,
        monthlyBackups: input.monthlyBackups,
      },
    };

    const formattedResponse = formatter.format({
      agentType: 'database-backup',
      taskDescription: `Clean old backups for ${dbPath}`,
      status: 'success',
      results: result,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    const formattedError = formatter.format({
      agentType: 'database-backup',
      taskDescription: `Clean old backups for ${input.dbPath || 'default database'}`,
      status: 'error',
      error: errorObj,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedError,
        },
      ],
    };
  }
}

/**
 * get_backup_stats - Get backup statistics for a database
 *
 * @example
 * ```typescript
 * await executeBackupStats({}, formatter);
 * ```
 */
export async function executeBackupStats(
  input: ValidatedBackupStatsInput,
  formatter: ResponseFormatter
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const dbPath = resolveDbPath(input.dbPath);
    const manager = new BackupManager();

    logger.info(`[DatabaseBackup] Getting backup stats for: ${dbPath}`);

    const stats = await manager.getBackupStats(dbPath);

    const result = {
      database: dbPath,
      totalBackups: stats.totalBackups,
      totalSize: formatBytes(stats.totalSize),
      averageSize: formatBytes(stats.averageSize),
      oldestBackup: stats.oldestBackup ? formatDate(stats.oldestBackup) : null,
      newestBackup: stats.newestBackup ? formatDate(stats.newestBackup) : null,
    };

    const formattedResponse = formatter.format({
      agentType: 'database-backup',
      taskDescription: `Get backup statistics for ${dbPath}`,
      status: 'success',
      results: result,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    const formattedError = formatter.format({
      agentType: 'database-backup',
      taskDescription: `Get backup statistics for ${input.dbPath || 'default database'}`,
      status: 'error',
      error: errorObj,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: formattedError,
        },
      ],
    };
  }
}
