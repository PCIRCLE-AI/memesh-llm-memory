import { z } from 'zod';
import { join } from 'path';
import { BackupManager } from '../../db/BackupManager.js';
import { logger } from '../../utils/logger.js';
export const CreateBackupInputSchema = z.object({
    dbPath: z
        .string()
        .optional()
        .describe('Path to database file (default: data/knowledge-graph.db). Supports: knowledge-graph.db, evolution.db, collaboration.db'),
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
function resolveDbPath(dbPath) {
    if (!dbPath) {
        return join(process.cwd(), 'data', 'knowledge-graph.db');
    }
    if (!dbPath.includes('/') && !dbPath.includes('\\')) {
        return join(process.cwd(), 'data', dbPath.endsWith('.db') ? dbPath : `${dbPath}.db`);
    }
    return dbPath;
}
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
}
function formatDate(date) {
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}
export async function executeCreateBackup(input, formatter) {
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
                    type: 'text',
                    text: formattedResponse,
                },
            ],
        };
    }
    catch (error) {
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
                    type: 'text',
                    text: formattedError,
                },
            ],
        };
    }
}
export async function executeListBackups(input, formatter) {
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
                    type: 'text',
                    text: formattedResponse,
                },
            ],
        };
    }
    catch (error) {
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
                    type: 'text',
                    text: formattedError,
                },
            ],
        };
    }
}
export async function executeRestoreBackup(input, formatter) {
    try {
        const manager = new BackupManager();
        logger.info(`[DatabaseBackup] Restoring from backup: ${input.backupPath}`);
        let targetPath = input.targetPath;
        if (!targetPath) {
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
                    type: 'text',
                    text: formattedResponse,
                },
            ],
        };
    }
    catch (error) {
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
                    type: 'text',
                    text: formattedError,
                },
            ],
        };
    }
}
export async function executeCleanBackups(input, formatter) {
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
                    type: 'text',
                    text: formattedResponse,
                },
            ],
        };
    }
    catch (error) {
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
                    type: 'text',
                    text: formattedError,
                },
            ],
        };
    }
}
export async function executeBackupStats(input, formatter) {
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
                    type: 'text',
                    text: formattedResponse,
                },
            ],
        };
    }
    catch (error) {
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
                    type: 'text',
                    text: formattedError,
                },
            ],
        };
    }
}
//# sourceMappingURL=database-backup.js.map