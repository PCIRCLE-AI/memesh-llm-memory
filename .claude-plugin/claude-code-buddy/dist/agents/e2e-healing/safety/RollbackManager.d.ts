interface RollbackRecord {
    testId: string;
    timestamp: number;
    reason: string;
}
type ExecFunction = (command: string, args: string[]) => Promise<{
    stdout: string;
    stderr: string;
}>;
export declare class RollbackManager {
    private static readonly TESTID_REGEX;
    private static readonly DESCRIPTION_REGEX;
    private static readonly MESSAGE_REGEX;
    private checkpoints;
    private rollbackHistory;
    private readonly MAX_ROLLBACK_HISTORY;
    private execFunction;
    constructor();
    private validateTestId;
    private validateDescription;
    private validateMessage;
    setExecFunction(fn: ExecFunction): void;
    createCheckpoint(testId: string, description: string): Promise<string>;
    rollback(testId: string, reason?: string): Promise<void>;
    commit(testId: string, message: string): Promise<void>;
    getRollbackHistory(): RollbackRecord[];
    private getLatestStashId;
    private defaultExec;
}
export {};
//# sourceMappingURL=RollbackManager.d.ts.map