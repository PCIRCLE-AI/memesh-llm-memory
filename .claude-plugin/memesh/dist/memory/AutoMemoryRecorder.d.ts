import type { UnifiedMemoryStore } from './UnifiedMemoryStore.js';
export declare class AutoMemoryRecorder {
    private memoryStore;
    private importanceThreshold;
    constructor(memoryStore: UnifiedMemoryStore);
    recordCodeChange(data: {
        files: string[];
        linesChanged: number;
        description: string;
        projectPath?: string;
    }): Promise<string | null>;
    recordTestEvent(data: {
        type: 'pass' | 'fail';
        testName: string;
        error?: string;
        projectPath?: string;
    }): Promise<string | null>;
    recordGitCommit(data: {
        message: string;
        filesChanged: number;
        insertions: number;
        deletions: number;
        projectPath?: string;
    }): Promise<string | null>;
    recordError(data: {
        message: string;
        stack?: string;
        context?: string;
        projectPath?: string;
    }): Promise<string>;
    private calculateCodeChangeImportance;
    private calculateCommitImportance;
    setImportanceThreshold(threshold: number): void;
}
//# sourceMappingURL=AutoMemoryRecorder.d.ts.map