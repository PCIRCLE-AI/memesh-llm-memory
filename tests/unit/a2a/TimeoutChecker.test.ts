import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeoutChecker } from '../../../src/a2a/jobs/TimeoutChecker.js';
import type { MCPTaskDelegator } from '../../../src/a2a/delegator/MCPTaskDelegator.js';

describe('TimeoutChecker background job', () => {
  let checker: TimeoutChecker;
  let mockDelegator: MCPTaskDelegator;

  beforeEach(() => {
    mockDelegator = {
      checkTimeouts: vi.fn().mockResolvedValue(undefined)
    } as any;

    checker = new TimeoutChecker(mockDelegator);
  });

  afterEach(() => {
    checker.stop();
  });

  it('should call checkTimeouts periodically', async () => {
    checker.start(100); // 100ms interval for testing

    // Wait 250ms (should trigger 2-3 times)
    await new Promise(resolve => setTimeout(resolve, 250));

    expect(mockDelegator.checkTimeouts).toHaveBeenCalledTimes(2);

    checker.stop();
  });

  it('should not call checkTimeouts when stopped', async () => {
    checker.start(100);
    checker.stop();

    await new Promise(resolve => setTimeout(resolve, 250));

    expect(mockDelegator.checkTimeouts).toHaveBeenCalledTimes(0);
  });

  it('should use default interval of 60 seconds', () => {
    checker.start();

    expect(checker.isRunning()).toBe(true);
    expect(checker.getInterval()).toBe(60000);

    checker.stop();
  });
});
