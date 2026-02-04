import { IpcTransport } from './IpcTransport.js';
export type BootstrapMode = 'daemon' | 'proxy' | 'standalone';
export interface BootstrapResult {
    mode: BootstrapMode;
    reason: string;
    existingDaemon?: {
        pid: number;
        version: string;
        socketPath: string;
    };
}
export interface DaemonBootstrapConfig {
    version: string;
    protocolVersion?: number;
    healthCheckTimeout?: number;
    forceStandalone?: boolean;
}
export declare function isDaemonDisabled(): boolean;
export declare class DaemonBootstrap {
    private config;
    private transport;
    constructor(config: DaemonBootstrapConfig);
    determineMode(): Promise<BootstrapResult>;
    private checkDaemonHealth;
    acquireDaemonLock(): Promise<boolean>;
    private calculateMinClientVersion;
    getTransport(): IpcTransport;
    getVersion(): string;
    getProtocolVersion(): number;
}
export declare function shouldRunAsProxy(): Promise<boolean>;
export declare function bootstrap(config: DaemonBootstrapConfig): Promise<BootstrapResult>;
//# sourceMappingURL=DaemonBootstrap.d.ts.map