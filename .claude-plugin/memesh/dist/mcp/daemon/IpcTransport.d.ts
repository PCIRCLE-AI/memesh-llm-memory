import net from 'net';
export interface IpcTransportConfig {
    socketName?: string;
    connectTimeout?: number;
    keepAlive?: boolean;
    keepAliveInitialDelay?: number;
}
export interface ConnectOptions {
    timeout?: number;
    retry?: boolean;
    maxRetries?: number;
    retryDelay?: number;
}
export interface ServerOptions {
    backlog?: number;
    exclusive?: boolean;
}
export declare class IpcTransport {
    private config;
    constructor(config?: IpcTransportConfig);
    getPath(): string;
    isWindows(): boolean;
    cleanup(): void;
    cleanupStaleSocket(): Promise<boolean>;
    private testSocketConnection;
    createServer(options?: ServerOptions): net.Server;
    listen(server: net.Server, options?: ServerOptions): Promise<void>;
    connect(options?: ConnectOptions): Promise<net.Socket>;
    private connectWithRetry;
    private connectOnce;
    isRunning(timeout?: number): Promise<boolean>;
    ping(): Promise<number | null>;
    getPathInfo(): {
        path: string;
        platform: string;
        type: 'socket' | 'pipe';
        exists: boolean;
    };
    private sleep;
}
export declare function createIpcTransport(config?: IpcTransportConfig): IpcTransport;
//# sourceMappingURL=IpcTransport.d.ts.map