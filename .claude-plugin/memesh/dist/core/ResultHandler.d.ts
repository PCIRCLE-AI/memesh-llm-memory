import { BackgroundTask } from './types.js';
export declare class ResultHandler {
    handleCompleted(task: BackgroundTask, result: unknown): void;
    handleFailed(task: BackgroundTask, error: Error): void;
    handleCancelled(task: BackgroundTask): void;
    private executeCallback;
    private sanitizeCallbackError;
}
//# sourceMappingURL=ResultHandler.d.ts.map