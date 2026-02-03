import { type Ora } from 'ora';
import type { Options as OraOptions } from 'ora';
export interface ProgressStep {
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
}
export interface ProgressOptions {
    showElapsed?: boolean;
    showEstimate?: boolean;
    spinner?: OraOptions['spinner'];
}
export declare class ProgressIndicator {
    private spinner;
    private steps;
    private currentStepIndex;
    private startTime;
    private options;
    constructor(options?: ProgressOptions);
    start(steps: string[]): void;
    nextStep(): void;
    fail(error?: string): void;
    complete(message?: string): void;
    stop(): void;
    private updateSpinner;
    private formatStepText;
    private formatTimeText;
    private formatElapsedTime;
    private estimateCompletion;
    static simple(message: string, spinner?: OraOptions['spinner']): Ora;
    static success(message: string): void;
    static error(message: string): void;
    static warn(message: string): void;
    static info(message: string): void;
}
//# sourceMappingURL=ProgressIndicator.d.ts.map