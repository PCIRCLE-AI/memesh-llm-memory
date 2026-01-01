import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RollbackManager } from '../../../../src/agents/e2e-healing/safety/RollbackManager.js';

describe('RollbackManager', () => {
  let manager: RollbackManager;

  beforeEach(() => {
    manager = new RollbackManager();
  });

  it('should create checkpoint before applying fix', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: 'abc123',
      stderr: '',
    });

    manager.setExecFunction(mockExec);

    const checkpointId = await manager.createCheckpoint(
      'test-1',
      'Fix for Button.tsx'
    );

    expect(checkpointId).toBeTruthy();
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('git stash push')
    );
  });

  it('should rollback to checkpoint on failure', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: 'Rolled back',
      stderr: '',
    });

    manager.setExecFunction(mockExec);

    await manager.createCheckpoint('test-1', 'Fix');
    await manager.rollback('test-1');

    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('git stash pop')
    );
  });

  it('should commit changes on success', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: 'Committed',
      stderr: '',
    });

    manager.setExecFunction(mockExec);

    await manager.createCheckpoint('test-1', 'Fix');
    await manager.commit('test-1', 'Applied E2E healing fix');

    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('git commit')
    );
  });

  it('should track rollback history', async () => {
    const mockExec = vi.fn().mockResolvedValue({
      stdout: '',
      stderr: '',
    });

    manager.setExecFunction(mockExec);

    await manager.createCheckpoint('test-1', 'Fix 1');
    await manager.rollback('test-1');
    await manager.createCheckpoint('test-2', 'Fix 2');
    await manager.rollback('test-2');

    const history = manager.getRollbackHistory();

    expect(history).toHaveLength(2);
    expect(history[0].testId).toBe('test-1');
    expect(history[1].testId).toBe('test-2');
  });
});
