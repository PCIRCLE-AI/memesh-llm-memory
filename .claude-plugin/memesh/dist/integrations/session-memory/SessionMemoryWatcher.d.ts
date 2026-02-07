import type { SessionMemoryEvent } from './types.js';
interface WatcherConfig {
    projectsDir: string;
    debounceMs?: number;
    onMemoryUpdate: (event: SessionMemoryEvent) => Promise<void>;
}
export declare class SessionMemoryWatcher {
    private watcher;
    private processedHashes;
    private debounceTimers;
    private changeTypes;
    private stopped;
    private config;
    constructor(config: WatcherConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    parseFilePath(filePath: string): {
        sessionId: string;
        sanitizedPath: string;
    };
    desanitizePath(sanitized: string): string;
    private handleFileChange;
    private processFile;
    get isWatching(): boolean;
}
export {};
//# sourceMappingURL=SessionMemoryWatcher.d.ts.map