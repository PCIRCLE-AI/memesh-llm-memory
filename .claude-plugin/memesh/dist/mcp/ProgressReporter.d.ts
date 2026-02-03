export interface ProgressUpdate {
    progressToken: string;
    progress: number;
    total: number;
}
export type ProgressSender = (update: ProgressUpdate) => Promise<void>;
export declare class ProgressReporter {
    private progressToken;
    private sendProgress;
    constructor(progressToken: string | undefined, sendProgress: ProgressSender);
    report(current: number, total: number, message?: string): Promise<void>;
    isEnabled(): boolean;
}
//# sourceMappingURL=ProgressReporter.d.ts.map