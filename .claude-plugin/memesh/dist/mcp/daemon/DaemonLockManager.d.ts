export interface LockInfo {
    pid: number;
    socketPath: string;
    startTime: number;
    version: string;
    clientCount: number;
    protocolVersion: number;
    minClientVersion: string;
    instanceId?: string;
}
export interface LockAcquisitionResult {
    success: boolean;
    reason?: 'already_locked' | 'stale_lock_cleared' | 'write_error';
    existingLock?: LockInfo;
}
export interface InstanceVerificationResult {
    isValid: boolean;
    reason: 'pid_alive_instance_verified' | 'pid_alive_instance_mismatch' | 'pid_dead' | 'no_instance_id' | 'connection_failed';
}
export declare class DaemonLockManager {
    private static readonly LOCK_FILENAME;
    private static readonly IPC_VERIFY_TIMEOUT;
    static getLockPath(): string;
    static generateInstanceId(): string;
    static isValidUuid(uuid: string): boolean;
    static readLock(): Promise<LockInfo | null>;
    static isPidAlive(pid: number): boolean;
    static verifyInstance(lockInfo: LockInfo): Promise<InstanceVerificationResult>;
    private static verifyInstanceViaIpc;
    static isLockValid(): Promise<boolean>;
    static isLockValidStrict(): Promise<boolean>;
    static acquireLock(info: Omit<LockInfo, 'pid' | 'instanceId'>): Promise<LockAcquisitionResult>;
    private static tryAtomicAcquire;
    static releaseLock(): Promise<boolean>;
    static updateLock(updates: Partial<Omit<LockInfo, 'pid' | 'instanceId'>>, maxRetries?: number): Promise<boolean>;
    static forceClearLock(): Promise<boolean>;
    static getStatus(): Promise<{
        lockExists: boolean;
        lockPath: string;
        lockInfo: LockInfo | null;
        isValid: boolean;
        isPidAlive: boolean;
        instanceVerification?: InstanceVerificationResult;
    }>;
    static getOwnInstanceId(): Promise<string | null>;
}
//# sourceMappingURL=DaemonLockManager.d.ts.map