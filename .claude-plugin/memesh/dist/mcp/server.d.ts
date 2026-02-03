#!/usr/bin/env node
export declare class ToolCallTimeoutError extends Error {
    readonly toolName: string;
    readonly timeoutMs: number;
    readonly elapsedMs: number;
    constructor(toolName: string, timeoutMs: number, elapsedMs: number);
}
declare class ClaudeCodeBuddyMCPServer {
    private server;
    private components;
    private toolRouter;
    private sessionBootstrapper;
    private isShuttingDown;
    private shutdownPromise;
    get toolHandlers(): import("./handlers/ToolHandlers.js").ToolHandlers;
    get buddyHandlers(): import("./handlers/BuddyHandlers.js").BuddyHandlers;
    get developmentButler(): import("../index.js").DevelopmentButler;
    private constructor();
    static create(): Promise<ClaudeCodeBuddyMCPServer>;
    private setupHandlers;
    start(): Promise<void>;
    private setupSignalHandlers;
    private shutdown;
    private performShutdown;
}
export { ClaudeCodeBuddyMCPServer };
//# sourceMappingURL=server.d.ts.map