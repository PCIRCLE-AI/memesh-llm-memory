import { exec } from 'child_process';
import { promisify } from 'util';
import { TestResult } from '../types.js';

const execAsync = promisify(exec);

type ExecFunction = (command: string) => Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;

type ScreenshotCapture = (testFile: string) => Promise<string>;

export class PlaywrightRunner {
  private execFunction: ExecFunction;
  private screenshotCapture?: ScreenshotCapture;

  constructor() {
    this.execFunction = this.defaultExec;
  }

  setExecFunction(fn: ExecFunction): void {
    this.execFunction = fn;
  }

  setScreenshotCapture(fn: ScreenshotCapture): void {
    this.screenshotCapture = fn;
  }

  async executeTest(testFile: string): Promise<TestResult> {
    try {
      const command = `npx playwright test ${testFile} --reporter=json`;
      const result = await this.execFunction(command);

      if (result.exitCode === 0) {
        return {
          status: 'success',
        };
      }

      // Test failed - capture evidence
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
    } catch (err) {
      return {
        status: 'failure',
        error: err as Error,
      };
    }
  }

  private extractLogs(output: string): string[] {
    return output
      .split('\n')
      .filter((line) => line.includes('console.'))
      .map((line) => line.trim());
  }

  private async defaultExec(command: string): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    try {
      const { stdout, stderr } = await execAsync(command);
      return {
        exitCode: 0,
        stdout,
        stderr,
      };
    } catch (err: any) {
      return {
        exitCode: err.code || 1,
        stdout: err.stdout || '',
        stderr: err.stderr || err.message,
      };
    }
  }
}
