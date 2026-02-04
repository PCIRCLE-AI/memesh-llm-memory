export interface RequestInfo {
    requestId: string;
    clientId: string;
    startTime: number;
}
export declare enum ShutdownReason {
    UPGRADE = "upgrade",
    USER_REQUESTED = "user_requested",
    IDLE_TIMEOUT = "idle_timeout",
    ERROR = "error"
}
type ShutdownNotification = {
    type: 'shutdown';
    reason: ShutdownReason;
    gracePeriod: number;
    timestamp: number;
};
type UpgradePendingNotification = {
    type: 'upgrade_pending';
    newVersion: string;
    estimatedShutdownTime: number;
    initiatorClientId: string;
    timestamp: number;
};
export type CoordinatorNotification = ShutdownNotification | UpgradePendingNotification;
export interface ShutdownConfig {
    maxWaitTime: number;
    checkInterval: number;
    notifyClients: (message: CoordinatorNotification) => Promise<void>;
}
export interface ShutdownMetrics {
    totalRequestsTracked: number;
    totalRequestsCompleted: number;
    currentPending: number;
    requestsByClient: Record<string, number>;
    forceShutdown: boolean;
    forceKilledRequests: string[];
}
export declare class GracefulShutdownCoordinator {
    private readonly config;
    private pendingRequests;
    private totalTracked;
    private totalCompleted;
    private forceShutdownTriggered;
    private forceKilledRequestIds;
    private shuttingDown;
    private pendingUpgrade;
    private upgradeVersion;
    private upgradeInitiator;
    private waitTimeoutId;
    constructor(config: Partial<ShutdownConfig>);
    trackRequest(requestId: string, clientId: string): void;
    completeRequest(requestId: string): void;
    getPendingRequests(): RequestInfo[];
    get isShuttingDown(): boolean;
    get isPendingUpgrade(): boolean;
    canAcceptRequest(): boolean;
    initiateShutdown(reason: ShutdownReason): Promise<void>;
    initiateUpgrade(newVersion: string, initiatorClientId: string): Promise<void>;
    getMetrics(): ShutdownMetrics;
    private waitForPendingRequests;
    cancelWaitTimeout(): void;
    private notifyShutdown;
    private notifyUpgradePending;
}
export {};
//# sourceMappingURL=GracefulShutdownCoordinator.d.ts.map