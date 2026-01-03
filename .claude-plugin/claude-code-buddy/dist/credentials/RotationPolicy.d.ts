import Database from 'better-sqlite3';
export interface RotationPolicyConfig {
    id?: number;
    name: string;
    servicePattern: string;
    maxAgeDays: number;
    warningDays: number;
    enforceRotation: boolean;
    autoArchive: boolean;
    metadata?: Record<string, any>;
}
export interface RotationStatus {
    needsRotation: boolean;
    isExpired: boolean;
    ageInDays: number;
    daysUntilExpiration: number;
    lastRotated?: Date;
    policy?: RotationPolicyConfig;
    warningMessage?: string;
}
export interface RotationStats {
    totalCredentials: number;
    needsRotation: number;
    expired: number;
    healthyCredentials: number;
    averageAge: number;
    oldestCredential: {
        service: string;
        account: string;
        ageInDays: number;
    } | null;
}
export declare class RotationPolicy {
    private db;
    private cleanupTimer;
    constructor(db: Database.Database);
    private initializeSchema;
    createPolicy(config: Omit<RotationPolicyConfig, 'id'>): RotationPolicyConfig;
    getPolicy(id: number): RotationPolicyConfig | null;
    getPolicyByName(name: string): RotationPolicyConfig | null;
    listPolicies(): RotationPolicyConfig[];
    updatePolicy(id: number, updates: Partial<Omit<RotationPolicyConfig, 'id'>>): void;
    deletePolicy(id: number): void;
    findPolicyForService(service: string): RotationPolicyConfig | null;
    checkRotationStatus(service: string, account: string): RotationStatus;
    markAsRotated(service: string, account: string): void;
    assignPolicy(service: string, account: string, policyId: number): void;
    listCredentialsNeedingRotation(): Array<{
        service: string;
        account: string;
        status: RotationStatus;
    }>;
    getRotationStats(): RotationStats;
    archiveExpiredCredentials(): number;
    private validatePolicy;
    private mapRowToPolicy;
    private startCleanup;
    stopCleanup(): void;
}
//# sourceMappingURL=RotationPolicy.d.ts.map