// tests/unit/ProgressReporter.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ProgressReporter } from '../../src/mcp/ProgressReporter';

describe('ProgressReporter', () => {
  it('should report progress updates', async () => {
    const mockSendProgress = vi.fn();
    const reporter = new ProgressReporter('test-token', mockSendProgress);

    await reporter.report(1, 5, 'Processing task 1/5');

    expect(mockSendProgress).toHaveBeenCalledWith({
      progressToken: 'test-token',
      progress: 1,
      total: 5,
    });
  });

  it('should not report when token is missing', async () => {
    const mockSendProgress = vi.fn();
    const reporter = new ProgressReporter(undefined, mockSendProgress);

    await reporter.report(1, 5, 'Processing');

    expect(mockSendProgress).not.toHaveBeenCalled();
  });
});
