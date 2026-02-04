import type { AgentRegistryEntry, RegisterAgentParams } from '../types/index.js';
export declare class AgentRegistry {
    private db;
    private static instance;
    private constructor();
    static getInstance(dbPath?: string): AgentRegistry;
    private initializeSchema;
    register(params: RegisterAgentParams): AgentRegistryEntry;
    get(agentId: string): AgentRegistryEntry | null;
    listActive(): AgentRegistryEntry[];
    listAll(): AgentRegistryEntry[];
    heartbeat(agentId: string): boolean;
    deactivate(agentId: string): boolean;
    cleanupStale(staleThresholdMs?: number): number;
    deleteStale(): number;
    close(): void;
    private rowToEntry;
}
export declare function startAgentRegistryCleanup(): void;
export declare function stopAgentRegistryCleanup(): void;
//# sourceMappingURL=AgentRegistry.d.ts.map