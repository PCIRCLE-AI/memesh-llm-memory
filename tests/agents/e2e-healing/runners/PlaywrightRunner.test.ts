import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaywrightRunner } from '../../../../src/agents/e2e-healing/runners/PlaywrightRunner.js';

describe('PlaywrightRunner', () => {
  let runner: PlaywrightRunner;

  beforeEach(() => {
    runner = new PlaywrightRunner();
  });

  describe('executeTest', () => {
    it('should execute test and return success', async () => {
      // Mock successful test execution
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: 'All tests passed',
        stderr: '',
      });

      runner.setExecFunction(mockExec);

      const result = await runner.executeTest('tests/Button.test.tsx');

      expect(result.status).toBe('success');
      expect(mockExec).toHaveBeenCalledWith(
        'npx',
        expect.arrayContaining(['playwright', 'test', 'tests/Button.test.tsx', '--reporter=json'])
      );
    });

    it('should capture screenshot on failure', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'Error: Button not found',
      });

      const mockScreenshot = vi.fn().mockResolvedValue('base64screenshot');

      runner.setExecFunction(mockExec);
      runner.setScreenshotCapture(mockScreenshot);

      const result = await runner.executeTest('tests/Button.test.tsx');

      expect(result.status).toBe('failure');
      expect(result.error).toBeDefined();
      expect(result.screenshot).toBe('base64screenshot');
    });

    it('should capture console logs on failure', async () => {
      const mockExec = vi.fn().mockResolvedValue({
        exitCode: 1,
        stdout: 'console.log: Test started\nconsole.error: Button not found',
        stderr: 'Error: Test failed',
      });

      runner.setExecFunction(mockExec);

      const result = await runner.executeTest('tests/Button.test.tsx');

      expect(result.status).toBe('failure');
      expect(result.logs).toContain('console.error: Button not found');
    });
  });
});
