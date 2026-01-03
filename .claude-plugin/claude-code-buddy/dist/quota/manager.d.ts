export interface QuotaLimits {
    daily?: number;
    monthly?: number;
    tokens?: number;
}
export interface ProviderQuota {
    provider: string;
    limits: QuotaLimits;
    usage: {
        daily: number;
        monthly: number;
        tokens: number;
        lastReset: Date;
    };
    available: boolean;
}
export interface QuotaCheckResult {
    canUse: boolean;
    reason?: string;
    remainingDaily?: number;
    remainingMonthly?: number;
    suggestedAlternatives?: string[];
}
export declare class QuotaManager {
    private providers;
    private quotas;
    private storageKey;
    constructor(providers: Map<string, QuotaLimits>);
    private initializeProviders;
    checkQuota(provider: string): QuotaCheckResult;
    recordUsage(provider: string, tokens?: number): void;
    getAvailableProviders(): string[];
    private getSuggestedAlternatives;
    private resetIfNeeded;
    getUsageStats(): Record<string, ProviderQuota>;
    private loadUsage;
    private saveUsage;
    markUnavailable(provider: string, durationMs?: number): void;
}
//# sourceMappingURL=manager.d.ts.map