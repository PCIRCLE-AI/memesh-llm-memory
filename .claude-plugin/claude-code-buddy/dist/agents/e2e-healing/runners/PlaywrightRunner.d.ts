import { TestResult } from '../types.js';
type ExecFunction = (command: string) => Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
}>;
type ScreenshotCapture = (testFile: string) => Promise<string>;
export declare class PlaywrightRunner {
    private execFunction;
    private screenshotCapture?;
    constructor();
    setExecFunction(fn: ExecFunction): void;
    setScreenshotCapture(fn: ScreenshotCapture): void;
    executeTest(testFile: string): Promise<TestResult>;
    private extractLogs;
    private defaultExec;
}
export {};
//# sourceMappingURL=PlaywrightRunner.d.ts.map