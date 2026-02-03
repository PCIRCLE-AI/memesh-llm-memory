import { TaskQueue } from '../storage/TaskQueue.js';
import type { AgentCard } from '../types/index.js';
export interface A2AServerConfig {
    agentId: string;
    agentCard: AgentCard;
    port?: number;
    portRange?: {
        min: number;
        max: number;
    };
    heartbeatInterval?: number;
}
export declare class A2AServer {
    private config;
    private app;
    private server;
    private taskQueue;
    private registry;
    private routes;
    private heartbeatTimer;
    private port;
    private delegator;
    private timeoutChecker;
    constructor(config: A2AServerConfig);
    private createApp;
    start(): Promise<number>;
    stop(): Promise<void>;
    getPort(): number;
    getTaskQueue(): TaskQueue;
    private findAvailablePort;
    private isPortAvailable;
    private startHeartbeat;
}
//# sourceMappingURL=A2AServer.d.ts.map