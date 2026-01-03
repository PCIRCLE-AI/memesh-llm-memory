export declare class DashboardServer {
    private app;
    private orchestrator;
    private collaborationManager;
    private port;
    constructor(port?: number);
    private setupMiddleware;
    private setupRoutes;
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=server.d.ts.map