import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
export var BackupDestinationType;
(function (BackupDestinationType) {
    BackupDestinationType["LOCAL_FILE"] = "local_file";
    BackupDestinationType["S3"] = "s3";
    BackupDestinationType["AZURE_BLOB"] = "azure_blob";
    BackupDestinationType["CUSTOM"] = "custom";
})(BackupDestinationType || (BackupDestinationType = {}));
export class BackupService {
    db;
    config;
    storage;
    backupTimer = null;
    constructor(db, config, storage) {
        this.db = db;
        this.config = {
            compress: true,
            encrypt: true,
            retentionDays: 30,
            maxBackups: 10,
            ...config,
        };
        this.storage = storage;
        this.initializeSchema();
    }
    initializeSchema() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS backup_metadata (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        size INTEGER NOT NULL,
        compressed INTEGER NOT NULL,
        encrypted INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        credential_count INTEGER NOT NULL,
        destination TEXT NOT NULL,
        version TEXT NOT NULL,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_backup_metadata_timestamp
        ON backup_metadata(timestamp);
    `);
        logger.info('Backup service initialized');
    }
    async createBackup() {
        const backupId = `backup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const timestamp = new Date();
        logger.info('Creating backup', { backupId });
        try {
            const credentials = this.db
                .prepare('SELECT * FROM credentials')
                .all();
            const backupData = {
                version: '1.0.0',
                timestamp: timestamp.toISOString(),
                credentials,
            };
            let data = Buffer.from(JSON.stringify(backupData), 'utf8');
            let compressed = false;
            let encrypted = false;
            if (this.config.compress) {
                data = await gzip(data);
                compressed = true;
                logger.debug('Backup compressed', {
                    originalSize: backupData.credentials.length,
                    compressedSize: data.length,
                });
            }
            if (this.config.encrypt) {
                if (!this.config.encryptionKey) {
                    throw new Error('Encryption enabled but no encryption key provided');
                }
                const key = Buffer.from(this.config.encryptionKey, 'hex');
                const iv = crypto.randomBytes(16);
                const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
                const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);
                data = Buffer.concat([iv, encryptedData]);
                encrypted = true;
                logger.debug('Backup encrypted');
            }
            const checksum = crypto.createHash('sha256').update(data).digest('hex');
            await this.writeBackup(backupId, data);
            const metadata = {
                id: backupId,
                timestamp,
                size: data.length,
                compressed,
                encrypted,
                checksum,
                credentialCount: credentials.length,
                destination: this.config.destination,
                version: '1.0.0',
            };
            this.db
                .prepare(`INSERT INTO backup_metadata
           (id, timestamp, size, compressed, encrypted, checksum, credential_count, destination, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(metadata.id, metadata.timestamp.getTime(), metadata.size, metadata.compressed ? 1 : 0, metadata.encrypted ? 1 : 0, metadata.checksum, metadata.credentialCount, metadata.destination, metadata.version);
            logger.info('Backup created successfully', {
                backupId: metadata.id,
                size: metadata.size,
                credentialCount: metadata.credentialCount,
            });
            await this.cleanupOldBackups();
            return metadata;
        }
        catch (error) {
            logger.error('Backup creation failed', {
                backupId,
                error: error.message,
            });
            throw new Error(`Backup failed: ${error.message}`);
        }
    }
    async writeBackup(backupId, data) {
        switch (this.config.destination) {
            case BackupDestinationType.LOCAL_FILE: {
                const backupDir = this.config.config.directory || './backups';
                await fs.mkdir(backupDir, { recursive: true });
                const filepath = path.join(backupDir, `${backupId}.bak`);
                await fs.writeFile(filepath, data);
                logger.debug('Backup written to local file', { filepath });
                break;
            }
            case BackupDestinationType.S3:
            case BackupDestinationType.AZURE_BLOB:
            case BackupDestinationType.CUSTOM:
                throw new Error(`Backup destination ${this.config.destination} not yet implemented`);
            default:
                throw new Error(`Unknown backup destination: ${this.config.destination}`);
        }
    }
    async readBackup(backupId) {
        switch (this.config.destination) {
            case BackupDestinationType.LOCAL_FILE: {
                const backupDir = this.config.config.directory || './backups';
                const filepath = path.join(backupDir, `${backupId}.bak`);
                const data = await fs.readFile(filepath);
                logger.debug('Backup read from local file', { filepath });
                return data;
            }
            case BackupDestinationType.S3:
            case BackupDestinationType.AZURE_BLOB:
            case BackupDestinationType.CUSTOM:
                throw new Error(`Backup destination ${this.config.destination} not yet implemented`);
            default:
                throw new Error(`Unknown backup destination: ${this.config.destination}`);
        }
    }
    async restore(options) {
        logger.info('Starting restore', { backupId: options.backupId });
        try {
            const metadataRow = this.db
                .prepare('SELECT * FROM backup_metadata WHERE id = ?')
                .get(options.backupId);
            if (!metadataRow) {
                throw new Error(`Backup not found: ${options.backupId}`);
            }
            let data = await this.readBackup(options.backupId);
            if (metadataRow.encrypted) {
                if (!this.config.encryptionKey) {
                    throw new Error('Backup is encrypted but no encryption key provided');
                }
                const key = Buffer.from(this.config.encryptionKey, 'hex');
                const iv = data.slice(0, 16);
                const encryptedData = data.slice(16);
                const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                data = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
                logger.debug('Backup decrypted');
            }
            if (metadataRow.compressed) {
                data = await gunzip(data);
                logger.debug('Backup decompressed');
            }
            const checksum = crypto.createHash('sha256').update(data).digest('hex');
            if (checksum !== metadataRow.checksum && !metadataRow.encrypted) {
                throw new Error('Backup checksum mismatch - data may be corrupted');
            }
            const backupData = JSON.parse(data.toString('utf8'));
            let credentialsToRestore = backupData.credentials;
            if (options.filter) {
                credentialsToRestore = credentialsToRestore.filter((cred) => {
                    if (options.filter.services && !options.filter.services.includes(cred.service)) {
                        return false;
                    }
                    if (options.filter.accounts && !options.filter.accounts.includes(cred.account)) {
                        return false;
                    }
                    return true;
                });
            }
            if (options.dryRun) {
                logger.info('Dry run completed', {
                    credentialsToRestore: credentialsToRestore.length,
                });
                return credentialsToRestore.length;
            }
            let restoredCount = 0;
            for (const cred of credentialsToRestore) {
                try {
                    if (!options.overwrite) {
                        const existing = this.db
                            .prepare('SELECT id FROM credentials WHERE service = ? AND account = ?')
                            .get(cred.service, cred.account);
                        if (existing) {
                            logger.debug('Skipping existing credential', {
                                service: cred.service,
                                account: cred.account,
                            });
                            continue;
                        }
                    }
                    this.db
                        .prepare(`INSERT OR REPLACE INTO credentials
               (service, account, created_at, updated_at)
               VALUES (?, ?, ?, ?)`)
                        .run(cred.service, cred.account, cred.created_at, cred.updated_at || Date.now());
                    restoredCount++;
                }
                catch (error) {
                    logger.error('Failed to restore credential', {
                        service: cred.service,
                        account: cred.account,
                        error: error.message,
                    });
                }
            }
            logger.info('Restore completed', {
                backupId: options.backupId,
                restoredCount,
            });
            return restoredCount;
        }
        catch (error) {
            logger.error('Restore failed', {
                backupId: options.backupId,
                error: error.message,
            });
            throw new Error(`Restore failed: ${error.message}`);
        }
    }
    listBackups() {
        const rows = this.db
            .prepare('SELECT * FROM backup_metadata ORDER BY timestamp DESC')
            .all();
        return rows.map((row) => ({
            id: row.id,
            timestamp: new Date(row.timestamp),
            size: row.size,
            compressed: row.compressed === 1,
            encrypted: row.encrypted === 1,
            checksum: row.checksum,
            credentialCount: row.credential_count,
            destination: row.destination,
            version: row.version,
        }));
    }
    async cleanupOldBackups() {
        const backups = this.listBackups();
        const now = Date.now();
        const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
        const toDelete = [];
        for (const backup of backups) {
            if (now - backup.timestamp.getTime() > retentionMs) {
                toDelete.push(backup.id);
            }
        }
        if (backups.length > this.config.maxBackups) {
            const excess = backups.slice(this.config.maxBackups);
            toDelete.push(...excess.map((b) => b.id));
        }
        for (const backupId of toDelete) {
            try {
                await this.deleteBackup(backupId);
            }
            catch (error) {
                logger.error('Failed to delete old backup', {
                    backupId,
                    error: error.message,
                });
            }
        }
        logger.info('Old backups cleaned up', { deletedCount: toDelete.length });
        return toDelete.length;
    }
    async deleteBackup(backupId) {
        switch (this.config.destination) {
            case BackupDestinationType.LOCAL_FILE: {
                const backupDir = this.config.config.directory || './backups';
                const filepath = path.join(backupDir, `${backupId}.bak`);
                try {
                    await fs.unlink(filepath);
                }
                catch (error) {
                }
                break;
            }
            default:
                break;
        }
        this.db.prepare('DELETE FROM backup_metadata WHERE id = ?').run(backupId);
        logger.info('Backup deleted', { backupId });
    }
    startScheduler(intervalHours = 24) {
        if (this.backupTimer) {
            logger.warn('Backup scheduler already running');
            return;
        }
        const intervalMs = intervalHours * 60 * 60 * 1000;
        this.backupTimer = setInterval(() => {
            this.createBackup().catch((error) => {
                logger.error('Scheduled backup failed', { error: error.message });
            });
        }, intervalMs);
        this.createBackup().catch((error) => {
            logger.error('Initial backup failed', { error: error.message });
        });
        logger.info('Backup scheduler started', { intervalHours });
    }
    stopScheduler() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = null;
            logger.info('Backup scheduler stopped');
        }
    }
    async verifyBackup(backupId) {
        try {
            const metadataRow = this.db
                .prepare('SELECT * FROM backup_metadata WHERE id = ?')
                .get(backupId);
            if (!metadataRow) {
                return false;
            }
            const data = await this.readBackup(backupId);
            const checksum = crypto.createHash('sha256').update(data).digest('hex');
            const valid = checksum === metadataRow.checksum;
            logger.info('Backup verification', {
                backupId,
                valid,
            });
            return valid;
        }
        catch (error) {
            logger.error('Backup verification failed', {
                backupId,
                error: error.message,
            });
            return false;
        }
    }
}
//# sourceMappingURL=BackupService.js.map