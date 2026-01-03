import type { Credential, CredentialQuery, SecureStorage } from '../types.js';
export interface StorageBackendConfig {
    backend: SecureStorage;
    name: string;
    priority: number;
    weight?: number;
    maxFailures?: number;
    resetTimeout?: number;
}
export declare enum LoadBalancingStrategy {
    PRIORITY = "priority",
    ROUND_ROBIN = "round_robin",
    WEIGHTED_RANDOM = "weighted_random",
    LEAST_USED = "least_used"
}
export interface StoragePoolStats {
    totalBackends: number;
    healthyBackends: number;
    circuitBrokenBackends: number;
    totalRequests: number;
    failedRequests: number;
    backendStats: Array<{
        name: string;
        healthy: boolean;
        circuitBroken: boolean;
        requests: number;
        failures: number;
        lastUsed?: Date;
    }>;
}
export declare class StoragePool implements SecureStorage {
    private backends;
    private health;
    private strategy;
    private roundRobinIndex;
    private totalRequests;
    private failedRequests;
    constructor(strategy?: LoadBalancingStrategy);
    addBackend(config: StorageBackendConfig): void;
    removeBackend(name: string): void;
    private getSortedBackends;
    private selectBackend;
    private executeWithFallback;
    set(credential: Credential): Promise<void>;
    get(service: string, account: string): Promise<Credential | null>;
    delete(service: string, account: string): Promise<void>;
    list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]>;
    isAvailable(): Promise<boolean>;
    healthCheck(): Promise<Map<string, boolean>>;
    getStats(): StoragePoolStats;
    resetAllCircuitBreakers(): void;
    getType(): string;
    dispose(): void;
}
//# sourceMappingURL=StoragePool.d.ts.map