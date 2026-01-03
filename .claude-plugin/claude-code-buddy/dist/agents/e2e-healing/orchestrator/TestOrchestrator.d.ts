import { HealingConstraints, HealingResult, TestResult, AttemptHistory, FixResult } from '../types.js';
interface E2EHealingContext {
    testFile: string;
    failureHistory: AttemptHistory[];
    codeContext?: string;
    constraints: HealingConstraints;
}
type TestRunner = (testFile: string) => Promise<TestResult>;
type Analyzer = (error: Error, context: E2EHealingContext) => Promise<{
    rootCause: string;
}>;
type FixApplier = (analysis: {
    rootCause: string;
}, context: E2EHealingContext) => Promise<FixResult>;
export declare class TestOrchestrator {
    private maxAttempts;
    private testRunner?;
    private analyzer?;
    private fixApplier?;
    constructor(config: {
        maxAttempts: number;
    });
    setTestRunner(runner: TestRunner): void;
    setAnalyzer(analyzer: Analyzer): void;
    setFixApplier(applier: FixApplier): void;
    healE2ETest(testFile: string, constraints: Partial<HealingConstraints>): Promise<HealingResult>;
}
export {};
//# sourceMappingURL=TestOrchestrator.d.ts.map