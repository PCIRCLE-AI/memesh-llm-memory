export interface E2EHealingConfig {
    maxAttempts: number;
    cooldownPeriod: number;
    failureThreshold: number;
    resetTimeout: number;
}
export interface HealingConstraints {
    maxAttempts: number;
    maxFilesModified: number;
    maxLinesChanged: number;
    allowedFilePatterns: string[];
    forbiddenFilePatterns: string[];
    maxDirectoryDepth: number;
}
export interface TestResult {
    status: 'success' | 'failure';
    error?: Error;
    screenshot?: string;
    logs?: string[];
}
export interface HealingResult {
    status: 'healed' | 'unhealed' | 'aborted';
    attempts: number;
    history: AttemptHistory[];
    reason?: string;
    recommendation?: string;
}
export interface AttemptHistory {
    attemptNumber: number;
    error: Error;
    analysis: string;
    fixApplied: FixResult;
    result: 'fixed' | 'failed';
}
export interface FixResult {
    status: 'applied' | 'skipped';
    reason?: string;
    files: CodeChange[];
}
export interface CodeChange {
    path: string;
    additions: number;
    deletions: number;
    diff: string;
}
//# sourceMappingURL=types.d.ts.map