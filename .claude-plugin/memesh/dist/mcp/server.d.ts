#!/usr/bin/env node
declare class ClaudeCodeBuddyMCPServer {
    private server;
    private components;
    private toolRouter;
    private sessionBootstrapper;
    private isShuttingDown;
    get toolHandlers(): import("./handlers/ToolHandlers.js").ToolHandlers;
    get buddyHandlers(): import("./handlers/BuddyHandlers.js").BuddyHandlers;
    get developmentButler(): import("../index.js").DevelopmentButler;
    private constructor();
    static create(): Promise<ClaudeCodeBuddyMCPServer>;
    private setupHandlers;
    start(): Promise<void>;
    private setupSignalHandlers;
    private shutdown;
}
export { ClaudeCodeBuddyMCPServer };
//# sourceMappingURL=server.d.ts.map