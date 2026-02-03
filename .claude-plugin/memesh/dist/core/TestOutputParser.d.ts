export interface FailedTest {
    name: string;
    file?: string;
    error?: string;
}
export interface TestResults {
    total: number;
    passed: number;
    failed: number;
    failedTests: FailedTest[];
    [key: string]: unknown;
}
export declare class TestOutputParser {
    parse(output: string): TestResults;
    private detectFramework;
    private parseVitestFailures;
    private parseJestFailures;
    private parseMochaFailures;
}
//# sourceMappingURL=TestOutputParser.d.ts.map