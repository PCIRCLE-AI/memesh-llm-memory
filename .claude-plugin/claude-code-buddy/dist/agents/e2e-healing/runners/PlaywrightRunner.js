import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class PlaywrightRunner {
    execFunction;
    screenshotCapture;
    constructor() {
        this.execFunction = this.defaultExec;
    }
    setExecFunction(fn) {
        this.execFunction = fn;
    }
    setScreenshotCapture(fn) {
        this.screenshotCapture = fn;
    }
    async executeTest(testFile) {
        try {
            const command = `npx playwright test ${testFile} --reporter=json`;
            const result = await this.execFunction(command);
            if (result.exitCode === 0) {
                return {
                    status: 'success',
                };
            }
            const error = new Error(result.stderr || result.stdout);
            const screenshot = this.screenshotCapture
                ? await this.screenshotCapture(testFile)
                : undefined;
            const logs = this.extractLogs(result.stdout);
            return {
                status: 'failure',
                error,
                screenshot,
                logs,
            };
        }
        catch (err) {
            return {
                status: 'failure',
                error: err,
            };
        }
    }
    extractLogs(output) {
        return output
            .split('\n')
            .filter((line) => line.includes('console.'))
            .map((line) => line.trim());
    }
    async defaultExec(command) {
        try {
            const { stdout, stderr } = await execAsync(command);
            return {
                exitCode: 0,
                stdout,
                stderr,
            };
        }
        catch (err) {
            return {
                exitCode: err.code || 1,
                stdout: err.stdout || '',
                stderr: err.stderr || err.message,
            };
        }
    }
}
//# sourceMappingURL=PlaywrightRunner.js.map