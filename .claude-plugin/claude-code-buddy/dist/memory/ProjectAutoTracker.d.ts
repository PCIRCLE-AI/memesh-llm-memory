import type { MCPToolInterface } from '../core/MCPToolInterface.js';
export interface TestResult {
    passed: number;
    failed: number;
    total: number;
    failures: string[];
}
export declare class ProjectAutoTracker {
    private mcp;
    private snapshotThreshold;
    private currentTokenCount;
    constructor(mcp: MCPToolInterface);
    getSnapshotThreshold(): number;
    getCurrentTokenCount(): number;
    addTokens(count: number): Promise<void>;
    recordCodeChange(files: string[], description: string): Promise<void>;
    recordTestResult(result: TestResult): Promise<void>;
    private createSnapshot;
    createFileChangeHook(): (files: string[], description: string) => Promise<void>;
    createTestResultHook(): (result: TestResult) => Promise<void>;
    createTokenHook(): (count: number) => Promise<void>;
}
//# sourceMappingURL=ProjectAutoTracker.d.ts.map