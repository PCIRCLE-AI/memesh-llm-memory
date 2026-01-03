import Database from 'better-sqlite3';
import type { SecureStorage } from './types.js';
export declare enum BackupDestinationType {
    LOCAL_FILE = "local_file",
    S3 = "s3",
    AZURE_BLOB = "azure_blob",
    CUSTOM = "custom"
}
export interface BackupConfig {
    destination: BackupDestinationType;
    config: Record<string, any>;
    compress?: boolean;
    encrypt?: boolean;
    encryptionKey?: string;
    retentionDays?: number;
    maxBackups?: number;
}
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
export interface RestoreOptions {
    backupId: string;
    overwrite?: boolean;
    filter?: {
        services?: string[];
        accounts?: string[];
        tags?: string[];
    };
    dryRun?: boolean;
}
export declare class BackupService {
    private db;
    private config;
    private storage?;
    private backupTimer;
    constructor(db: Database.Database, config: BackupConfig, storage?: SecureStorage);
    private initializeSchema;
    createBackup(): Promise<BackupMetadata>;
    private writeBackup;
    private readBackup;
    restore(options: RestoreOptions): Promise<number>;
    listBackups(): BackupMetadata[];
    cleanupOldBackups(): Promise<number>;
    deleteBackup(backupId: string): Promise<void>;
    startScheduler(intervalHours?: number): void;
    stopScheduler(): void;
    verifyBackup(backupId: string): Promise<boolean>;
}
//# sourceMappingURL=BackupService.d.ts.map