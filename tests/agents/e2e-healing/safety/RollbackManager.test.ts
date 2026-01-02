import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RollbackManager } from '../../../../src/agents/e2e-healing/safety/RollbackManager.js';

describe('RollbackManager', () => {
  let manager: RollbackManager;

  beforeEach(() => {
    manager = new RollbackManager();
  });

  it('should create checkpoint before applying fix', async () => {
    const mockExec = vi.fn().mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'stash' && args[1] === 'push') {
        return Promise.resolve({ stdout: '', stderr: '' });
      }
      if (cmd === 'git' && args[0] === 'stash' && args[1] === 'list') {
        return Promise.resolve({ stdout: 'stash@{0}: WIP on main: abc123 Fix', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    manager.setExecFunction(mockExec);

    const checkpointId = await manager.createCheckpoint(
      'test-1',
      'Fix for Button.tsx'
    );

    expect(checkpointId).toBe('stash@{0}');
    expect(mockExec).toHaveBeenCalledWith('git', expect.arrayContaining(['stash', 'push']));
  });

  it('should rollback to checkpoint on failure', async () => {
    const mockExec = vi.fn().mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'stash' && args[1] === 'list') {
        return Promise.resolve({ stdout: 'stash@{0}: WIP on main: abc123 Fix', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    manager.setExecFunction(mockExec);

    await manager.createCheckpoint('test-1', 'Fix');
    await manager.rollback('test-1');

    expect(mockExec).toHaveBeenCalledWith('git', expect.arrayContaining(['stash', 'pop']));
  });

  it('should commit changes on success', async () => {
    const mockExec = vi.fn().mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'stash' && args[1] === 'list') {
        return Promise.resolve({ stdout: 'stash@{0}: WIP on main: abc123 Fix', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });

    manager.setExecFunction(mockExec);

    await manager.createCheckpoint('test-1', 'Fix');
    await manager.commit('test-1', 'Applied E2E healing fix');

    expect(mockExec).toHaveBeenCalledWith('git', expect.arrayContaining(['commit']));
  });

  it('should track rollback history', async () => {
    const mockExec = vi.fn().mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'stash' && args[1] === 'list') {
        return Promise.resolve({ stdout: 'stash@{0}: WIP on main: abc123 Fix', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
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

  // Security Tests - Command Injection Prevention
  describe('Security - Command Injection Prevention', () => {
    it('should reject malicious testId with shell commands', async () => {
      const mockExec = vi.fn();
      manager.setExecFunction(mockExec);

      const maliciousTestId = 'test-1; rm -rf /';

      await expect(
        manager.createCheckpoint(maliciousTestId, 'Fix')
      ).rejects.toThrow(/invalid.*testId/i);

      // Should not execute any commands
      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should reject malicious description with command injection', async () => {
      const mockExec = vi.fn();
      manager.setExecFunction(mockExec);

      const maliciousDescription = 'Fix"; rm -rf /"';

      await expect(
        manager.createCheckpoint('test-1', maliciousDescription)
      ).rejects.toThrow(/invalid.*description/i);

      expect(mockExec).not.toHaveBeenCalled();
    });

    it('should reject malicious commit message', async () => {
      const mockExec = vi.fn().mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'stash' && args[1] === 'list') {
          return Promise.resolve({ stdout: 'stash@{0}: WIP on main: abc123 Fix', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      manager.setExecFunction(mockExec);

      await manager.createCheckpoint('test-1', 'Fix');

      const maliciousMessage = 'Applied fix"; rm -rf /"';

      await expect(
        manager.commit('test-1', maliciousMessage)
      ).rejects.toThrow(/invalid.*message/i);
    });

    it('should only allow alphanumeric, dashes, underscores in testId', async () => {
      const mockExec = vi.fn().mockImplementation((cmd: string, args: string[]) => {
        if (cmd === 'git' && args[0] === 'stash' && args[1] === 'list') {
          return Promise.resolve({ stdout: 'stash@{0}: WIP on main: abc123 Fix', stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      manager.setExecFunction(mockExec);

      // Valid testIds
      await expect(
        manager.createCheckpoint('test-123', 'Fix')
      ).resolves.toBeTruthy();

      await expect(
        manager.createCheckpoint('test_feature', 'Fix')
      ).resolves.toBeTruthy();

      await expect(
        manager.createCheckpoint('test-bug-fix', 'Fix')
      ).resolves.toBeTruthy();

      // Invalid testIds with special characters
      await expect(
        manager.createCheckpoint('test@123', 'Fix')
      ).rejects.toThrow(/invalid.*testId/i);

      await expect(
        manager.createCheckpoint('test$var', 'Fix')
      ).rejects.toThrow(/invalid.*testId/i);

      await expect(
        manager.createCheckpoint('test`cmd`', 'Fix')
      ).rejects.toThrow(/invalid.*testId/i);
    });
  });
});
