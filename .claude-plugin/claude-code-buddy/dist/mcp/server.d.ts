declare class ClaudeCodeBuddyMCPServer {
    private server;
    private components;
    private toolRouter;
    private fileWatcher?;
    get gitHandlers(): import("./handlers/GitHandlers.js").GitHandlers;
    get toolHandlers(): import("./handlers/ToolHandlers.js").ToolHandlers;
    get buddyHandlers(): import("./handlers/BuddyHandlers.js").BuddyHandlers;
    constructor();
    private setupHandlers;
    start(): Promise<void>;
    private startFileWatcherIfEnabled;
}
export { ClaudeCodeBuddyMCPServer };
//# sourceMappingURL=server.d.ts.map