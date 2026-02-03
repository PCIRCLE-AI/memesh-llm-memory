import { spawn } from 'child_process';
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
            const command = 'npx';
            const args = ['playwright', 'test', testFile, '--reporter=json'];
            const result = await this.execFunction(command, args);
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
    async defaultExec(command, args) {
        return await new Promise((resolve) => {
            const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
            let stdout = '';
            let stderr = '';
            let settled = false;
            const finish = (exitCode, extraStderr) => {
                if (settled)
                    return;
                settled = true;
                if (extraStderr) {
                    stderr += stderr ? `\n${extraStderr}` : extraStderr;
                }
                resolve({ exitCode, stdout, stderr });
            };
            proc.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            proc.on('error', (error) => {
                finish(1, error.message);
            });
            proc.on('close', (code) => {
                finish(code ?? 1);
            });
        });
    }
}
//# sourceMappingURL=PlaywrightRunner.js.map