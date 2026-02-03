export declare enum AutomationLevel {
    SUGGEST_ONLY = 0,
    AUTO_DEV = 1,
    AUTO_STAGING = 2,
    AUTO_PROD = 3
}
interface FixRecord {
    success: boolean;
    humanApproved: boolean;
    environment: string;
    timestamp: number;
}
export declare class GraduatedAutonomyPolicy {
    private currentLevel;
    private fixHistory;
    private readonly MAX_FIX_HISTORY;
    private rollbackCount;
    private graduationCriteria;
    getCurrentLevel(): AutomationLevel;
    recordFix(record: Omit<FixRecord, 'timestamp'>): void;
    recordRollback(_environment: string): void;
    canGraduateToNextLevel(): boolean;
    private isValidAutomationLevel;
    graduateToNextLevel(): void;
    degradeLevel(): void;
    isAllowedInEnvironment(environment: string): boolean;
    private calculateStats;
}
export {};
//# sourceMappingURL=GraduatedAutonomyPolicy.d.ts.map