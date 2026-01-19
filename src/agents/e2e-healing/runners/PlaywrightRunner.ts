import { spawn } from 'child_process';
import { TestResult } from '../types.js';

type ExecFunction = (command: string, args: string[]) => Promise<{
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
      const command = 'npx';
      const args = ['playwright', 'test', testFile, '--reporter=json'];
      const result = await this.execFunction(command, args);

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

  private async defaultExec(command: string, args: string[]): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    return await new Promise((resolve) => {
      const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let settled = false;

      const finish = (exitCode: number, extraStderr?: string) => {
        if (settled) return;
        settled = true;
        if (extraStderr) {
          stderr += stderr ? `\n${extraStderr}` : extraStderr;
        }
        resolve({ exitCode, stdout, stderr });
      };

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
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
