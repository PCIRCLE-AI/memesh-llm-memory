import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';
import { IpcTransport } from './IpcTransport.js';
export declare const DEFAULT_MAX_RECEIVE_BUFFER_SIZE: number;
export declare const REQUEST_TIMEOUT_MS = 60000;
export declare const MESSAGE_STALE_THRESHOLD_MS: number;
export interface StdioProxyClientConfig {
    transport: IpcTransport;
    clientVersion: string;
    maxReconnectAttempts?: number;
    reconnectDelay?: number;
    bufferSizeLimit?: number;
    maxReceiveBufferSize?: number;
    maxStdinBufferSize?: number;
    heartbeatInterval?: number;
    stdin?: Readable;
    stdout?: Writable;
    capabilities?: string[];
}
export interface ProxyStats {
    requestsForwarded: number;
    reconnects: number;
    bufferedMessages: number;
    bufferSizeBytes: number;
    connectionUptime: number;
}
export interface StdioProxyClientEvents {
    connected: () => void;
    disconnected: (reason: string) => void;
    upgrade_available: (newVersion: string) => void;
    error: (error: Error) => void;
    shutdown: (reason: string) => void;
}
export declare class StdioProxyClient extends EventEmitter {
    private config;
    private socket;
    private clientId;
    private assignedClientId;
    private connected;
    private connecting;
    private stopped;
    private connectionStartTime;
    private receiveBuffer;
    private pendingRequests;
    private messageBuffer;
    private bufferSize;
    private reconnectAttempts;
    private reconnectTimer;
    private heartbeatTimer;
    private requestsForwarded;
    private reconnects;
    private stdinDataListener;
    private stdinEndListener;
    private stdinBuffer;
    private handshakeBuffer;
    constructor(config: StdioProxyClientConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    isConnected(): boolean;
    getStats(): ProxyStats;
    getClientId(): string;
    private connectToDaemon;
    private setupSocketHandlers;
    private handleSocketData;
    private handleDaemonMessage;
    private handleMcpResponse;
    private handleShutdown;
    private handleError;
    private handleDisconnect;
    private performHandshake;
    private setupStdinHandler;
    private handleStdinMessage;
    private forwardMcpRequest;
    private sendMcpRequest;
    private bufferMessage;
    private flushMessageBuffer;
    private attemptReconnect;
    private rejectAllPending;
    private startHeartbeat;
    private stopHeartbeat;
    private writeToStdout;
}
export declare function createStdioProxyClient(transport: IpcTransport, clientVersion: string, options?: Partial<StdioProxyClientConfig>): StdioProxyClient;
//# sourceMappingURL=StdioProxyClient.d.ts.map