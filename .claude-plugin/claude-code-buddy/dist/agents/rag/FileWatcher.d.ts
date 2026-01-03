import type { IRAGAgent } from './types.js';
export interface FileWatcherOptions {
    watchDir?: string;
    supportedExtensions?: string[];
    batchSize?: number;
    pollingInterval?: number;
    onIndexed?: (files: string[]) => void;
    onError?: (error: Error, file?: string) => void;
}
export declare class FileWatcher {
    private watchDir;
    private supportedExtensions;
    private batchSize;
    private pollingInterval;
    private onIndexed?;
    private onError?;
    private isWatching;
    private intervalId?;
    private processedFiles;
    private ragAgent;
    constructor(ragAgent: IRAGAgent, options?: FileWatcherOptions);
    private getDefaultWatchDir;
    getWatchDir(): string;
    private sanitizeFilePath;
    start(): Promise<void>;
    stop(): void;
    private ensureWatchDirExists;
    private loadProcessedFiles;
    private saveProcessedFiles;
    private scanAndProcess;
    private processBatch;
    clearState(): Promise<void>;
}
//# sourceMappingURL=FileWatcher.d.ts.map