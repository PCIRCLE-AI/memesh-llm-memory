import Database from 'better-sqlite3';
import { RotationPolicy } from './RotationPolicy.js';
import { AuditLogger } from './AuditLogger.js';
export type RotationProvider = (service: string, account: string, currentValue: any) => Promise<any>;
export interface RotationResult {
    service: string;
    account: string;
    success: boolean;
    previousVersion?: string;
    newVersion?: string;
    rotatedAt: Date;
    error?: string;
    rollbackSupported: boolean;
}
export interface RotationJob {
    id?: number;
    service: string;
    account: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
    scheduledAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    metadata?: Record<string, any>;
}
export interface RotationServiceStats {
    totalRotations: number;
    successfulRotations: number;
    failedRotations: number;
    rolledBackRotations: number;
    averageRotationTime: number;
    lastRotation?: Date;
    credentialsNeedingRotation: number;
}
export declare class RotationService {
    private db;
    private rotationPolicy;
    private auditLogger;
    private providers;
    private schedulerTimer;
    private isRunning;
    constructor(db: Database.Database, rotationPolicy: RotationPolicy, auditLogger: AuditLogger);
    private initializeSchema;
    registerProvider(servicePattern: string, provider: RotationProvider): void;
    unregisterProvider(servicePattern: string): void;
    private getProvider;
    private matchesPattern;
    scheduleRotation(service: string, account: string, scheduledAt?: Date, metadata?: Record<string, any>): RotationJob;
    executeRotation(service: string, account: string, currentValue: any): Promise<RotationResult>;
    private hashValue;
    startScheduler(intervalMinutes?: number): void;
    stopScheduler(): void;
    private runScheduledRotations;
    getRotationHistory(service: string, account: string, limit?: number): RotationResult[];
    getStats(): RotationServiceStats;
    cleanupHistory(olderThanDays?: number): number;
    isSchedulerRunning(): boolean;
}
//# sourceMappingURL=RotationService.d.ts.map