import { promises as fs, existsSync, createReadStream, createWriteStream } from 'fs';
import { join, basename, dirname } from 'path';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
export class BackupManager {
    defaultBackupDir;
    defaultRetentionPolicy = {
        dailyBackups: 7,
        weeklyBackups: 4,
        monthlyBackups: 12,
    };
    constructor(backupDir) {
        this.defaultBackupDir = backupDir || join(process.cwd(), 'data', 'backups');
    }
    async createBackup(dbPath, options = {}) {
        const startTime = Date.now();
        logger.info(`[BackupManager] Starting backup of ${dbPath}`);
        if (!existsSync(dbPath)) {
            throw new Error(`Database not found: ${dbPath}`);
        }
        const compress = options.compress ?? true;
        const verify = options.verify ?? true;
        const backupDir = options.backupDir || this.defaultBackupDir;
        const prefix = options.prefix || '';
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const dateDirPath = join(backupDir, dateStr);
        await fs.mkdir(dateDirPath, { recursive: true });
        const dbName = basename(dbPath, '.db');
        const backupFilename = `${prefix}${dbName}_${timeStr}${compress ? '.db.gz' : '.db'}`;
        const backupPath = join(dateDirPath, backupFilename);
        await this.performVacuumBackup(dbPath, backupPath, compress);
        const stats = await fs.stat(backupPath);
        const size = stats.size;
        const checksum = await this.calculateChecksum(backupPath);
        const backupInfo = {
            timestamp: now,
            path: backupPath,
            size,
            compressed: compress,
            verified: false,
            dbName,
            checksum,
        };
        if (verify) {
            const isValid = await this.verifyBackup(backupPath, compress);
            backupInfo.verified = isValid;
            if (!isValid) {
                logger.error(`[BackupManager] Backup verification failed: ${backupPath}`);
                throw new Error(`Backup verification failed: ${backupPath}`);
            }
        }
        const duration = Date.now() - startTime;
        logger.info(`[BackupManager] Backup completed: ${backupPath} (${this.formatBytes(size)}, ${duration}ms)`);
        return backupInfo;
    }
    async performVacuumBackup(dbPath, backupPath, compress) {
        if (compress) {
            const tempPath = backupPath.replace('.gz', '.tmp');
            try {
                const db = new Database(dbPath, { readonly: true });
                try {
                    db.prepare(`VACUUM INTO ?`).run(tempPath);
                }
                finally {
                    db.close();
                }
                await this.compressFile(tempPath, backupPath);
                await fs.unlink(tempPath);
            }
            catch (error) {
                if (existsSync(tempPath)) {
                    await fs.unlink(tempPath).catch(() => {
                    });
                }
                throw error;
            }
        }
        else {
            const db = new Database(dbPath, { readonly: true });
            try {
                db.prepare(`VACUUM INTO ?`).run(backupPath);
            }
            finally {
                db.close();
            }
        }
    }
    async compressFile(inputPath, outputPath) {
        const input = createReadStream(inputPath);
        const output = createWriteStream(outputPath);
        const gzip = createGzip({ level: 9 });
        await pipeline(input, gzip, output);
    }
    async decompressFile(inputPath, outputPath) {
        const input = createReadStream(inputPath);
        const output = createWriteStream(outputPath);
        const gunzip = createGunzip();
        await pipeline(input, gunzip, output);
    }
    async calculateChecksum(filePath) {
        const { createHash } = await import('crypto');
        const hash = createHash('sha256');
        const stream = createReadStream(filePath);
        return new Promise((resolve, reject) => {
            stream.on('data', (chunk) => hash.update(chunk));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    async verifyBackup(backupPath, compressed = true) {
        try {
            logger.info(`[BackupManager] Verifying backup: ${backupPath}`);
            if (!existsSync(backupPath)) {
                logger.error(`[BackupManager] Backup file not found: ${backupPath}`);
                return false;
            }
            let tempDbPath = backupPath;
            if (compressed) {
                tempDbPath = backupPath.replace('.gz', '.verify.db');
                await this.decompressFile(backupPath, tempDbPath);
            }
            try {
                const db = new Database(tempDbPath, { readonly: true });
                try {
                    const result = db.prepare('PRAGMA integrity_check').get();
                    if (result.integrity_check !== 'ok') {
                        logger.error(`[BackupManager] Integrity check failed: ${result.integrity_check}`);
                        return false;
                    }
                    const tableCount = db.prepare(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`).get();
                    logger.info(`[BackupManager] Backup verified: ${tableCount.count} tables found`);
                    return true;
                }
                finally {
                    db.close();
                }
            }
            finally {
                if (compressed && existsSync(tempDbPath)) {
                    await fs.unlink(tempDbPath);
                }
            }
        }
        catch (error) {
            logger.error(`[BackupManager] Backup verification error: ${error}`);
            return false;
        }
    }
    async listBackups(dbPath) {
        const dbName = basename(dbPath, '.db');
        const backupDir = this.defaultBackupDir;
        if (!existsSync(backupDir)) {
            return [];
        }
        const backups = [];
        const dateDirs = await fs.readdir(backupDir);
        for (const dateDir of dateDirs) {
            const dateDirPath = join(backupDir, dateDir);
            const stat = await fs.stat(dateDirPath);
            if (!stat.isDirectory())
                continue;
            const files = await fs.readdir(dateDirPath);
            for (const file of files) {
                if (file.includes(dbName) && (file.endsWith('.db') || file.endsWith('.db.gz'))) {
                    const filePath = join(dateDirPath, file);
                    const fileStats = await fs.stat(filePath);
                    backups.push({
                        timestamp: fileStats.mtime,
                        path: filePath,
                        size: fileStats.size,
                        compressed: file.endsWith('.gz'),
                        verified: false,
                        dbName,
                    });
                }
            }
        }
        backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return backups;
    }
    async restoreBackup(backupPath, targetPath, options = {}) {
        logger.info(`[BackupManager] Restoring backup: ${backupPath} -> ${targetPath}`);
        if (!existsSync(backupPath)) {
            throw new Error(`Backup not found: ${backupPath}`);
        }
        const compressed = backupPath.endsWith('.gz');
        if (options.verify !== false) {
            const isValid = await this.verifyBackup(backupPath, compressed);
            if (!isValid) {
                throw new Error(`Backup verification failed: ${backupPath}`);
            }
        }
        const targetDir = dirname(targetPath);
        await fs.mkdir(targetDir, { recursive: true });
        if (existsSync(targetPath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupBeforeRestore = `${targetPath}.before-restore-${timestamp}`;
            await fs.copyFile(targetPath, backupBeforeRestore);
            logger.info(`[BackupManager] Current database backed up to: ${backupBeforeRestore}`);
        }
        if (compressed) {
            await this.decompressFile(backupPath, targetPath);
        }
        else {
            await fs.copyFile(backupPath, targetPath);
        }
        const db = new Database(targetPath, { readonly: true });
        try {
            const result = db.prepare('PRAGMA integrity_check').get();
            if (result.integrity_check !== 'ok') {
                throw new Error(`Restored database integrity check failed: ${result.integrity_check}`);
            }
        }
        finally {
            db.close();
        }
        logger.info(`[BackupManager] Restore completed successfully`);
    }
    async cleanOldBackups(dbPath, policy) {
        const retentionPolicy = policy || this.defaultRetentionPolicy;
        const backups = await this.listBackups(dbPath);
        if (backups.length === 0) {
            return 0;
        }
        logger.info(`[BackupManager] Cleaning old backups for ${dbPath} (found ${backups.length} backups)`);
        const now = new Date();
        const backupsToKeep = new Set();
        let deletedCount = 0;
        const dailyBackups = backups.filter((b) => {
            const age = now.getTime() - b.timestamp.getTime();
            const days = age / (1000 * 60 * 60 * 24);
            return days < retentionPolicy.dailyBackups;
        });
        dailyBackups.forEach((b) => backupsToKeep.add(b.path));
        const weeklyBackups = this.selectWeeklyBackups(backups, retentionPolicy.weeklyBackups);
        weeklyBackups.forEach((b) => backupsToKeep.add(b.path));
        if (retentionPolicy.monthlyBackups) {
            const monthlyBackups = this.selectMonthlyBackups(backups, retentionPolicy.monthlyBackups);
            monthlyBackups.forEach((b) => backupsToKeep.add(b.path));
        }
        for (const backup of backups) {
            if (!backupsToKeep.has(backup.path)) {
                try {
                    await fs.unlink(backup.path);
                    deletedCount++;
                    logger.info(`[BackupManager] Deleted old backup: ${backup.path}`);
                }
                catch (error) {
                    logger.error(`[BackupManager] Failed to delete backup ${backup.path}: ${error}`);
                }
            }
        }
        await this.cleanEmptyDateDirectories();
        logger.info(`[BackupManager] Cleanup completed: ${deletedCount} backups deleted, ${backupsToKeep.size} kept`);
        return deletedCount;
    }
    selectWeeklyBackups(backups, weeks) {
        const weeklyMap = new Map();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - weeks * 7);
        for (const backup of backups) {
            if (backup.timestamp < cutoffDate)
                continue;
            const weekKey = this.getISOWeek(backup.timestamp);
            const existing = weeklyMap.get(weekKey);
            if (!existing || backup.timestamp > existing.timestamp) {
                weeklyMap.set(weekKey, backup);
            }
        }
        return Array.from(weeklyMap.values());
    }
    selectMonthlyBackups(backups, months) {
        const monthlyMap = new Map();
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - months);
        for (const backup of backups) {
            if (backup.timestamp < cutoffDate)
                continue;
            const monthKey = `${backup.timestamp.getFullYear()}-${String(backup.timestamp.getMonth() + 1).padStart(2, '0')}`;
            const existing = monthlyMap.get(monthKey);
            if (!existing || backup.timestamp > existing.timestamp) {
                monthlyMap.set(monthKey, backup);
            }
        }
        return Array.from(monthlyMap.values());
    }
    getISOWeek(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    }
    async cleanEmptyDateDirectories() {
        const backupDir = this.defaultBackupDir;
        if (!existsSync(backupDir))
            return;
        const dateDirs = await fs.readdir(backupDir);
        for (const dateDir of dateDirs) {
            const dateDirPath = join(backupDir, dateDir);
            const stat = await fs.stat(dateDirPath);
            if (!stat.isDirectory())
                continue;
            const files = await fs.readdir(dateDirPath);
            if (files.length === 0) {
                await fs.rmdir(dateDirPath);
                logger.info(`[BackupManager] Removed empty directory: ${dateDirPath}`);
            }
        }
    }
    formatBytes(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
    async getBackupStats(dbPath) {
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
//# sourceMappingURL=BackupManager.js.map