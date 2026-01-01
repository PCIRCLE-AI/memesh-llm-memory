import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestOrchestrator } from '../../../../src/agents/e2e-healing/orchestrator/TestOrchestrator.js';

describe('TestOrchestrator', () => {
  let orchestrator: TestOrchestrator;

  beforeEach(() => {
    orchestrator = new TestOrchestrator({
      maxAttempts: 3,
    });
  });

  describe('healE2ETest', () => {
    it('should return healed if test passes on first attempt', async () => {
      const mockExecuteTest = vi.fn().mockResolvedValue({
        status: 'success',
      });

      orchestrator.setTestRunner(mockExecuteTest);

      const result = await orchestrator.healE2ETest(
        'tests/Button.test.tsx',
        {}
      );

      expect(result.status).toBe('healed');
      expect(result.attempts).toBe(1);
      expect(mockExecuteTest).toHaveBeenCalledTimes(1);
    });

    it('should retry up to maxAttempts', async () => {
      const mockExecuteTest = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure', error: new Error('test 1') })
        .mockResolvedValueOnce({ status: 'failure', error: new Error('test 2') })
        .mockResolvedValueOnce({ status: 'success' });

      const mockAnalyze = vi.fn().mockResolvedValue({
        rootCause: 'Missing class',
      });

      const mockApplyFix = vi.fn().mockResolvedValue({
        status: 'applied',
        files: [],
      });

      orchestrator.setTestRunner(mockExecuteTest);
      orchestrator.setAnalyzer(mockAnalyze);
      orchestrator.setFixApplier(mockApplyFix);

      const result = await orchestrator.healE2ETest(
        'tests/Button.test.tsx',
        {}
      );

      expect(result.status).toBe('healed');
      expect(result.attempts).toBe(3);
      expect(mockExecuteTest).toHaveBeenCalledTimes(3);
    });

    it('should abort if maxAttempts reached without success', async () => {
      const mockExecuteTest = vi.fn().mockResolvedValue({
        status: 'failure',
        error: new Error('persistent error'),
      });

      const mockAnalyze = vi.fn().mockResolvedValue({
        rootCause: 'Unknown',
      });

      const mockApplyFix = vi.fn().mockResolvedValue({
        status: 'applied',
        files: [],
      });

      orchestrator.setTestRunner(mockExecuteTest);
      orchestrator.setAnalyzer(mockAnalyze);
      orchestrator.setFixApplier(mockApplyFix);

      const result = await orchestrator.healE2ETest(
        'tests/Button.test.tsx',
        {}
      );

      expect(result.status).toBe('unhealed');
      expect(result.attempts).toBe(3);
      expect(result.recommendation).toContain('Manual intervention');
    });
  });
});
