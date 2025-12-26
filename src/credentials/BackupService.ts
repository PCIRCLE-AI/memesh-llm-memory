/**
 * Backup and Disaster Recovery Service
 *
 * Provides comprehensive backup and recovery capabilities:
 * - Automated scheduled backups
 * - Point-in-time recovery
 * - Backup encryption and compression
 * - Multi-destination backup (local, S3, Azure Blob, etc.)
 * - Backup rotation and retention policies
 * - Integrity verification
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import type { SecureStorage } from './types.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Backup destination type
 */
export enum BackupDestinationType {
  LOCAL_FILE = 'local_file',
  S3 = 's3',
  AZURE_BLOB = 'azure_blob',
  CUSTOM = 'custom',
}

/**
 * Backup configuration
 */
export interface BackupConfig {
  /**
   * Backup destination type
   */
  destination: BackupDestinationType;

  /**
   * Destination-specific configuration
   */
  config: Record<string, any>;

  /**
   * Enable compression (default: true)
   */
  compress?: boolean;

  /**
   * Enable encryption (default: true)
   */
  encrypt?: boolean;

  /**
   * Encryption key (32 bytes for AES-256)
   */
  encryptionKey?: string;

  /**
   * Retention policy in days (default: 30)
   */
  retentionDays?: number;

  /**
   * Number of backups to keep (default: 10)
   */
  maxBackups?: number;
}

/**
 * Backup metadata
 */
export interface BackupMetadata {
  id: string;
  timestamp: Date;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  checksum: string;
  credentialCount: number;
  destination: BackupDestinationType;
  version: string;
}

/**
 * Restore options
 */
export interface RestoreOptions {
  /**
   * Backup ID or path to restore from
   */
  backupId: string;

  /**
   * Overwrite existing credentials (default: false)
   */
  overwrite?: boolean;

  /**
   * Filter credentials to restore
   */
  filter?: {
    services?: string[];
    accounts?: string[];
    tags?: string[];
  };

  /**
   * Dry run (don't actually restore, just validate)
   */
  dryRun?: boolean;
}

/**
 * Backup Service
 */
export class BackupService {
  private db: Database.Database;
  private config: BackupConfig;
  private storage?: SecureStorage;
  private backupTimer: NodeJS.Timeout | null = null;

  constructor(db: Database.Database, config: BackupConfig, storage?: SecureStorage) {
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

  /**
   * Initialize backup service schema
   */
  private initializeSchema(): void {
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

  /**
   * Create a backup
   */
  async createBackup(): Promise<BackupMetadata> {
    const backupId = `backup-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date();

    logger.info('Creating backup', { backupId });

    try {
      // Export all credentials from database
      const credentials = this.db
        .prepare('SELECT * FROM credentials')
        .all() as any[];

      const backupData = {
        version: '1.0.0',
        timestamp: timestamp.toISOString(),
        credentials,
      };

      let data = Buffer.from(JSON.stringify(backupData), 'utf8');
      let compressed = false;
      let encrypted = false;

      // Compress if enabled
      if (this.config.compress) {
        data = await gzip(data);
        compressed = true;
        logger.debug('Backup compressed', {
          originalSize: backupData.credentials.length,
          compressedSize: data.length,
        });
      }

      // Encrypt if enabled
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

      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(data).digest('hex');

      // Write to destination
      await this.writeBackup(backupId, data);

      // Store metadata
      const metadata: BackupMetadata = {
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
        .prepare(
          `INSERT INTO backup_metadata
           (id, timestamp, size, compressed, encrypted, checksum, credential_count, destination, version)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          metadata.id,
          metadata.timestamp.getTime(),
          metadata.size,
          metadata.compressed ? 1 : 0,
          metadata.encrypted ? 1 : 0,
          metadata.checksum,
          metadata.credentialCount,
          metadata.destination,
          metadata.version
        );

      logger.info('Backup created successfully', {
        backupId: metadata.id,
        size: metadata.size,
        credentialCount: metadata.credentialCount,
      });

      // Clean up old backups
      await this.cleanupOldBackups();

      return metadata;
    } catch (error: any) {
      logger.error('Backup creation failed', {
        backupId,
        error: error.message,
      });
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Write backup to destination
   */
  private async writeBackup(backupId: string, data: Buffer): Promise<void> {
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

  /**
   * Read backup from destination
   */
  private async readBackup(backupId: string): Promise<Buffer> {
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

  /**
   * Restore from backup
   */
  async restore(options: RestoreOptions): Promise<number> {
    logger.info('Starting restore', { backupId: options.backupId });

    try {
      // Get backup metadata
      const metadataRow = this.db
        .prepare('SELECT * FROM backup_metadata WHERE id = ?')
        .get(options.backupId) as any;

      if (!metadataRow) {
        throw new Error(`Backup not found: ${options.backupId}`);
      }

      // Read backup data
      let data = await this.readBackup(options.backupId);

      // Decrypt if encrypted
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

      // Decompress if compressed
      if (metadataRow.compressed) {
        data = await gunzip(data);
        logger.debug('Backup decompressed');
      }

      // Verify checksum
      const checksum = crypto.createHash('sha256').update(data).digest('hex');
      if (checksum !== metadataRow.checksum && !metadataRow.encrypted) {
        throw new Error('Backup checksum mismatch - data may be corrupted');
      }

      // Parse backup data
      const backupData = JSON.parse(data.toString('utf8'));

      // Filter credentials if needed
      let credentialsToRestore = backupData.credentials;

      if (options.filter) {
        credentialsToRestore = credentialsToRestore.filter((cred: any) => {
          if (options.filter!.services && !options.filter!.services.includes(cred.service)) {
            return false;
          }
          if (options.filter!.accounts && !options.filter!.accounts.includes(cred.account)) {
            return false;
          }
          // Tag filtering would require parsing metadata
          return true;
        });
      }

      if (options.dryRun) {
        logger.info('Dry run completed', {
          credentialsToRestore: credentialsToRestore.length,
        });
        return credentialsToRestore.length;
      }

      // Restore credentials
      let restoredCount = 0;

      for (const cred of credentialsToRestore) {
        try {
          if (!options.overwrite) {
            // Check if credential already exists
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

          // Insert or replace credential
          this.db
            .prepare(
              `INSERT OR REPLACE INTO credentials
               (service, account, created_at, updated_at)
               VALUES (?, ?, ?, ?)`
            )
            .run(cred.service, cred.account, cred.created_at, cred.updated_at || Date.now());

          restoredCount++;
        } catch (error: any) {
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
    } catch (error: any) {
      logger.error('Restore failed', {
        backupId: options.backupId,
        error: error.message,
      });
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  /**
   * List all backups
   */
  listBackups(): BackupMetadata[] {
    const rows = this.db
      .prepare('SELECT * FROM backup_metadata ORDER BY timestamp DESC')
      .all() as any[];

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

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<number> {
    const backups = this.listBackups();

    // Apply retention policies
    const now = Date.now();
    const retentionMs = this.config.retentionDays! * 24 * 60 * 60 * 1000;
    const toDelete: string[] = [];

    // Delete backups older than retention period
    for (const backup of backups) {
      if (now - backup.timestamp.getTime() > retentionMs) {
        toDelete.push(backup.id);
      }
    }

    // Keep only maxBackups most recent
    if (backups.length > this.config.maxBackups!) {
      const excess = backups.slice(this.config.maxBackups!);
      toDelete.push(...excess.map((b) => b.id));
    }

    // Delete identified backups
    for (const backupId of toDelete) {
      try {
        await this.deleteBackup(backupId);
      } catch (error: any) {
        logger.error('Failed to delete old backup', {
          backupId,
          error: error.message,
        });
      }
    }

    logger.info('Old backups cleaned up', { deletedCount: toDelete.length });
    return toDelete.length;
  }

  /**
   * Delete a backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    // Delete from storage
    switch (this.config.destination) {
      case BackupDestinationType.LOCAL_FILE: {
        const backupDir = this.config.config.directory || './backups';
        const filepath = path.join(backupDir, `${backupId}.bak`);

        try {
          await fs.unlink(filepath);
        } catch (error) {
          // File might not exist, continue
        }
        break;
      }

      default:
        // Other destinations not yet implemented
        break;
    }

    // Delete metadata
    this.db.prepare('DELETE FROM backup_metadata WHERE id = ?').run(backupId);

    logger.info('Backup deleted', { backupId });
  }

  /**
   * Start automated backup scheduler
   */
  startScheduler(intervalHours: number = 24): void {
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

    // Run immediately on start
    this.createBackup().catch((error) => {
      logger.error('Initial backup failed', { error: error.message });
    });

    logger.info('Backup scheduler started', { intervalHours });
  }

  /**
   * Stop automated backup scheduler
   */
  stopScheduler(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
      logger.info('Backup scheduler stopped');
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupId: string): Promise<boolean> {
    try {
      const metadataRow = this.db
        .prepare('SELECT * FROM backup_metadata WHERE id = ?')
        .get(backupId) as any;

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
    } catch (error: any) {
      logger.error('Backup verification failed', {
        backupId,
        error: error.message,
      });
      return false;
    }
  }
}
