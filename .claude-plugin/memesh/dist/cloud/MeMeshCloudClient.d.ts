export interface CloudMemory {
    id: string;
    content: string;
    summary?: string;
    space: string;
    tags: string[];
    similarity?: number;
    createdAt: string;
}
export interface CloudMemoryWriteRequest {
    content: string;
    space: string;
    summary?: string;
    tags?: string[];
    sensitivity?: 'normal' | 'sensitive' | 'critical';
    source?: string;
}
export type CloudMemorySearchResult = CloudMemory[];
export interface CloudBatchWriteRequest {
    memories: CloudMemoryWriteRequest[];
    transactional?: boolean;
}
export interface CloudBatchWriteResult {
    total: number;
    succeeded: number;
    failed: number;
    successes: Array<{
        index: number;
        id: string;
        content: string;
        createdAt: string;
    }>;
    failures: Array<{
        index: number;
        content: string;
        errorCode: string;
        errorMessage: string;
    }>;
    transactional: boolean;
}
export interface CloudAgentRegisterRequest {
    agentType: string;
    agentName?: string;
    agentVersion?: string;
    capabilities?: Record<string, unknown>;
}
export interface CloudAgentInfo {
    id: string;
    agentType: string;
    agentName: string;
    agentVersion?: string;
    status: string;
    capabilities: Record<string, unknown>;
    createdAt: string;
    lastHeartbeat?: string;
    pendingMessages?: number;
}
export interface CloudSyncStatus {
    connected: boolean;
    localCount: number;
    cloudCount: number;
}
export declare class MeMeshCloudClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly timeoutMs;
    constructor(apiKey?: string, baseUrl?: string, timeoutMs?: number);
    get isConfigured(): boolean;
    authenticate(): Promise<{
        valid: boolean;
        agentId?: string;
        agentType?: string;
    }>;
    writeMemory(memory: CloudMemoryWriteRequest): Promise<string>;
    writeMemories(memories: CloudMemoryWriteRequest[], transactional?: boolean): Promise<CloudBatchWriteResult>;
    searchMemory(query: string, options?: {
        limit?: number;
        spaces?: string[];
    }): Promise<CloudMemorySearchResult>;
    getSyncStatus(localCount: number): Promise<CloudSyncStatus>;
    registerAgent(agent: CloudAgentRegisterRequest): Promise<CloudAgentInfo>;
    private requireAuth;
    private request;
}
export declare function getCloudClient(): MeMeshCloudClient;
export declare function isCloudEnabled(): boolean;
export declare function resetCloudClient(): void;
//# sourceMappingURL=MeMeshCloudClient.d.ts.map