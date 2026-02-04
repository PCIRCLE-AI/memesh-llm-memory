import { EventEmitter } from 'events';
import { IpcTransport } from './IpcTransport.js';
import { type RequestUpgradeMessage } from './DaemonProtocol.js';
export declare const ErrorCodes: {
    readonly INVALID_MESSAGE: "INVALID_MESSAGE";
    readonly HANDSHAKE_REQUIRED: "HANDSHAKE_REQUIRED";
    readonly UNKNOWN_MESSAGE_TYPE: "UNKNOWN_MESSAGE_TYPE";
    readonly NO_HANDLER: "NO_HANDLER";
    readonly HANDLER_ERROR: "HANDLER_ERROR";
    readonly BUFFER_OVERFLOW: "BUFFER_OVERFLOW";
    readonly HANDSHAKE_TIMEOUT: "HANDSHAKE_TIMEOUT";
};
export interface ClientInfo {
    clientId: string;
    version: string;
    protocolVersion: number;
    capabilities: string[];
    pid: number;
    connectedAt: number;
    lastActivity: number;
    handshakeComplete: boolean;
}
export interface DaemonSocketServerConfig {
    transport: IpcTransport;
    version: string;
    heartbeatInterval?: number;
    heartbeatTimeout?: number;
    maxBufferSize?: number;
    handshakeTimeout?: number;
}
export type McpHandler = (request: unknown) => Promise<unknown>;
export interface DaemonSocketServerEvents {
    client_connect: (client: ClientInfo) => void;
    client_disconnect: (clientId: string) => void;
    upgrade_requested: (request: RequestUpgradeMessage) => void;
}
export declare class DaemonSocketServer extends EventEmitter {
    private config;
    private server;
    private clients;
    private mcpHandler;
    private startTime;
    private requestsProcessed;
    private isRunning;
    private heartbeatCheckInterval;
    constructor(config: DaemonSocketServerConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    getClientCount(): number;
    getClients(): ClientInfo[];
    disconnectClient(clientId: string): void;
    setMcpHandler(handler: McpHandler): void;
    on<K extends keyof DaemonSocketServerEvents>(event: K, listener: DaemonSocketServerEvents[K]): this;
    emit<K extends keyof DaemonSocketServerEvents>(event: K, ...args: Parameters<DaemonSocketServerEvents[K]>): boolean;
    private handleConnection;
    private handleData;
    private handleMessage;
    private handleHandshake;
    private handleHeartbeat;
    private handleMcpRequest;
    private handleDisconnectMessage;
    private handleUpgradeRequest;
    private handleDisconnect;
    private clearHandshakeTimer;
    private sendMessage;
    private sendError;
    private updateLockClientCount;
    private startHeartbeatCheck;
    private stopHeartbeatCheck;
}
//# sourceMappingURL=DaemonSocketServer.d.ts.map