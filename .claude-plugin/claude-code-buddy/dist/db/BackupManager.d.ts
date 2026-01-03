export interface BackupOptions {
    compress?: boolean;
    backupDir?: string;
    verify?: boolean;
    prefix?: string;
}
export interface BackupInfo {
    timestamp: Date;
    path: string;
    size: number;
    compressed: boolean;
    verified: boolean;
    dbName: string;
    checksum?: string;
}
export interface RetentionPolicy {
    dailyBackups: number;
    weeklyBackups: number;
    monthlyBackups?: number;
}
export declare class BackupManager {
    private readonly defaultBackupDir;
    private readonly defaultRetentionPolicy;
    constructor(backupDir?: string);
    createBackup(dbPath: string, options?: BackupOptions): Promise<BackupInfo>;
    private performVacuumBackup;
    private compressFile;
    private decompressFile;
    private calculateChecksum;
    verifyBackup(backupPath: string, compressed?: boolean): Promise<boolean>;
    listBackups(dbPath: string): Promise<BackupInfo[]>;
    restoreBackup(backupPath: string, targetPath: string, options?: {
        verify?: boolean;
    }): Promise<void>;
    cleanOldBackups(dbPath: string, policy?: RetentionPolicy): Promise<number>;
    private selectWeeklyBackups;
    private selectMonthlyBackups;
    private getISOWeek;
    private cleanEmptyDateDirectories;
    private formatBytes;
    getBackupStats(dbPath: string): Promise<{
        totalBackups: number;
        totalSize: number;
        oldestBackup: Date | null;
        newestBackup: Date | null;
        averageSize: number;
    }>;
}
//# sourceMappingURL=BackupManager.d.ts.map