/**
 * Test: AgentRegistry Singleton Behavior (MAJOR-2)
 *
 * Tests for AgentRegistry singleton pattern to ensure:
 * 1. getInstance returns same instance
 * 2. getInstance with different path throws (prevents path confusion)
 * 3. close() properly cleans up
 * 4. resetInstance() for test isolation (if implemented)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentRegistry } from '../AgentRegistry.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';

// Helper to clean up singleton state between tests
function resetSingleton(): void {
  try {
    // Close existing instance if any
    const instance = AgentRegistry.getInstance();
    instance.close();
  } catch {
    // Ignore errors if no instance exists
  }
}

describe('AgentRegistry Singleton Behavior (MAJOR-2)', () => {
  let testDbPath: string;

  beforeEach(() => {
    resetSingleton();
    // Create unique test database path
    testDbPath = path.join(os.tmpdir(), `test-singleton-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  });

  afterEach(() => {
    resetSingleton();
    // Clean up test database files
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      // Clean up WAL files
      if (fs.existsSync(`${testDbPath}-wal`)) {
        fs.unlinkSync(`${testDbPath}-wal`);
      }
      if (fs.existsSync(`${testDbPath}-shm`)) {
        fs.unlinkSync(`${testDbPath}-shm`);
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getInstance', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = AgentRegistry.getInstance(testDbPath);
      const instance2 = AgentRegistry.getInstance(testDbPath);
      const instance3 = AgentRegistry.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('should create instance with specified path on first call', () => {
      const instance = AgentRegistry.getInstance(testDbPath);

      // Verify instance is functional
      expect(instance).toBeDefined();
      expect(typeof instance.register).toBe('function');
      expect(typeof instance.get).toBe('function');
      expect(typeof instance.listActive).toBe('function');
    });

    it('should throw when called with different path (prevents path confusion)', () => {
      // First call creates instance with testDbPath
      const instance1 = AgentRegistry.getInstance(testDbPath);
      expect(instance1).toBeDefined();

      // Second call with different path should throw
      const differentPath = path.join(os.tmpdir(), `different-${Date.now()}.db`);

      expect(() => AgentRegistry.getInstance(differentPath)).toThrow(
        /AgentRegistry singleton already exists/
      );

      // Clean up the different path if it was created
      try {
        if (fs.existsSync(differentPath)) {
          fs.unlinkSync(differentPath);
        }
      } catch {
        // Ignore
      }
    });

    it('should work correctly after getInstance with no path', () => {
      // First call with path
      const instance1 = AgentRegistry.getInstance(testDbPath);

      // Subsequent calls without path should return same instance
      const instance2 = AgentRegistry.getInstance();
      const instance3 = AgentRegistry.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('close', () => {
    it('should properly clean up and allow new instance creation', () => {
      // Create first instance
      const instance1 = AgentRegistry.getInstance(testDbPath);

      // Register an agent
      instance1.register({
        agentId: 'test-agent-1',
        baseUrl: 'http://localhost:3001',
        port: 3001,
      });

      // Verify agent was registered
      const agent = instance1.get('test-agent-1');
      expect(agent).toBeDefined();
      expect(agent?.agentId).toBe('test-agent-1');

      // Close the instance
      instance1.close();

      // Create new instance with different path
      const newPath = path.join(os.tmpdir(), `new-singleton-${Date.now()}.db`);
      const instance2 = AgentRegistry.getInstance(newPath);

      // Should be a different instance
      expect(instance2).toBeDefined();

      // Old agent should not exist in new instance
      const oldAgent = instance2.get('test-agent-1');
      expect(oldAgent).toBeNull();

      // Clean up
      instance2.close();
      try {
        if (fs.existsSync(newPath)) {
          fs.unlinkSync(newPath);
        }
      } catch {
        // Ignore
      }
    });

    it('should set instance to null after close', () => {
      const instance1 = AgentRegistry.getInstance(testDbPath);
      instance1.close();

      // Getting instance again should create new one
      const newPath = path.join(os.tmpdir(), `after-close-${Date.now()}.db`);
      const instance2 = AgentRegistry.getInstance(newPath);

      // Verify new instance is functional
      expect(instance2).toBeDefined();
      instance2.register({
        agentId: 'new-agent',
        baseUrl: 'http://localhost:3002',
        port: 3002,
      });

      const agent = instance2.get('new-agent');
      expect(agent?.agentId).toBe('new-agent');

      // Clean up
      instance2.close();
      try {
        if (fs.existsSync(newPath)) {
          fs.unlinkSync(newPath);
        }
      } catch {
        // Ignore
      }
    });
  });

  describe('Test isolation', () => {
    it('should allow creating fresh instance after close for test isolation', () => {
      // Simulate test 1
      const path1 = path.join(os.tmpdir(), `test1-${Date.now()}.db`);
      const instance1 = AgentRegistry.getInstance(path1);
      instance1.register({
        agentId: 'agent-test1',
        baseUrl: 'http://localhost:3001',
        port: 3001,
      });
      expect(instance1.get('agent-test1')).toBeDefined();
      instance1.close();

      // Simulate test 2 - should be isolated
      const path2 = path.join(os.tmpdir(), `test2-${Date.now()}.db`);
      const instance2 = AgentRegistry.getInstance(path2);

      // Should not have agent from test 1
      expect(instance2.get('agent-test1')).toBeNull();

      instance2.register({
        agentId: 'agent-test2',
        baseUrl: 'http://localhost:3002',
        port: 3002,
      });
      expect(instance2.get('agent-test2')).toBeDefined();

      // Clean up
      instance2.close();
      [path1, path2].forEach(p => {
        try {
          if (fs.existsSync(p)) fs.unlinkSync(p);
          if (fs.existsSync(`${p}-wal`)) fs.unlinkSync(`${p}-wal`);
          if (fs.existsSync(`${p}-shm`)) fs.unlinkSync(`${p}-shm`);
        } catch {
          // Ignore
        }
      });
    });

    it('should handle rapid getInstance/close cycles', () => {
      // Simulate multiple test runs
      for (let i = 0; i < 5; i++) {
        const testPath = path.join(os.tmpdir(), `rapid-test-${Date.now()}-${i}.db`);
        const instance = AgentRegistry.getInstance(testPath);

        // Use the instance
        instance.register({
          agentId: `agent-${i}`,
          baseUrl: `http://localhost:${3000 + i}`,
          port: 3000 + i,
        });

        const agent = instance.get(`agent-${i}`);
        expect(agent).toBeDefined();
        expect(agent?.port).toBe(3000 + i);

        // Close for next iteration
        instance.close();

        // Clean up
        try {
          if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
          if (fs.existsSync(`${testPath}-wal`)) fs.unlinkSync(`${testPath}-wal`);
          if (fs.existsSync(`${testPath}-shm`)) fs.unlinkSync(`${testPath}-shm`);
        } catch {
          // Ignore
        }
      }
    });
  });

  describe('Registry functionality with singleton', () => {
    it('should persist data across getInstance calls within same lifecycle', () => {
      const instance1 = AgentRegistry.getInstance(testDbPath);

      // Register agent via first reference
      instance1.register({
        agentId: 'persistent-agent',
        baseUrl: 'http://localhost:3000',
        port: 3000,
        capabilities: { streaming: true, pushNotifications: false },
      });

      // Get via second reference
      const instance2 = AgentRegistry.getInstance();
      const agent = instance2.get('persistent-agent');

      expect(agent).toBeDefined();
      expect(agent?.baseUrl).toBe('http://localhost:3000');
      expect(agent?.capabilities).toEqual({
        streaming: true,
        pushNotifications: false,
      });
    });

    it('should handle multiple agents with singleton', () => {
      const instance = AgentRegistry.getInstance(testDbPath);

      // Register multiple agents
      for (let i = 0; i < 10; i++) {
        instance.register({
          agentId: `agent-${i}`,
          baseUrl: `http://localhost:${3000 + i}`,
          port: 3000 + i,
        });
      }

      // Verify all agents via getInstance
      const instance2 = AgentRegistry.getInstance();
      const activeAgents = instance2.listActive();

      expect(activeAgents.length).toBe(10);
      expect(activeAgents.some(a => a.agentId === 'agent-5')).toBe(true);
    });
  });

  describe('Orphan Process Cleanup', () => {
    it('should kill orphaned process when cleaning up stale agents', async () => {
      const instance = AgentRegistry.getInstance(testDbPath);

      // Spawn a dummy long-running process to simulate MeMesh server
      const dummyProcess = spawn('sleep', ['300'], {
        detached: false, // Attached to this test process
        stdio: 'ignore',
      });

      const pid = dummyProcess.pid!;
      expect(pid).toBeGreaterThan(0);

      // Register agent with this PID
      instance.register({
        agentId: 'test-orphan-agent',
        baseUrl: 'http://localhost:3000',
        port: 3000,
        processPid: pid,
      });

      // Verify agent registered
      const agent = instance.get('test-orphan-agent');
      expect(agent).toBeDefined();
      expect(agent?.processPid).toBe(pid);

      // Verify process is running
      let processExists = true;
      try {
        process.kill(pid, 0); // Signal 0 just checks if process exists
      } catch {
        processExists = false;
      }
      expect(processExists).toBe(true);

      // Make the process an orphan by killing its parent (simulate detached process)
      // Since we can't easily make it truly orphaned in test, we'll unref it
      dummyProcess.unref();

      // Run cleanup (should detect orphan and kill it)
      const markedStale = await instance.cleanupStale();
      expect(markedStale).toBeGreaterThan(0);

      // Delete stale agents
      const deleted = instance.deleteStale();
      expect(deleted).toBeGreaterThan(0);

      // Verify process was killed
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for kill signal
      processExists = true;
      try {
        process.kill(pid, 0);
      } catch {
        processExists = false;
      }
      expect(processExists).toBe(false);

      // Cleanup: ensure process is dead
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Already dead, which is good
      }
    });

    it('should not kill process if isProcessActive returns true (has TTY)', async () => {
      const instance = AgentRegistry.getInstance(testDbPath);

      // Spawn a real process
      const dummyProcess = spawn('sleep', ['300'], {
        detached: false,
        stdio: 'ignore',
      });

      const pid = dummyProcess.pid!;

      // Mock isProcessActive to return true (simulate having TTY)
      const originalMethod = (instance as any).isProcessActive;
      (instance as any).isProcessActive = vi.fn().mockResolvedValue(true);

      // Register agent
      instance.register({
        agentId: 'test-active-agent',
        baseUrl: 'http://localhost:3000',
        port: 3000,
        processPid: pid,
      });

      // Run cleanup
      const markedStale = await instance.cleanupStale();

      // Should NOT mark as stale because isProcessActive returned true
      expect(markedStale).toBe(0);

      // Agent should still be active
      const agent = instance.get('test-active-agent');
      expect(agent?.status).toBe('active');

      // Verify process is still running (not killed)
      let processExists = true;
      try {
        process.kill(pid, 0);
      } catch {
        processExists = false;
      }
      expect(processExists).toBe(true);

      // Restore original method
      (instance as any).isProcessActive = originalMethod;

      // Clean up
      dummyProcess.unref();
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Already dead
      }
    });

    it('should mark agent as stale if process does not exist', async () => {
      const instance = AgentRegistry.getInstance(testDbPath);

      // Use a PID that definitely doesn't exist (very high number)
      const fakePid = 999999;

      // Register agent with fake PID
      instance.register({
        agentId: 'test-nonexistent-agent',
        baseUrl: 'http://localhost:3000',
        port: 3000,
        processPid: fakePid,
      });

      // Run cleanup
      const markedStale = await instance.cleanupStale();
      expect(markedStale).toBeGreaterThan(0);

      // Agent should be marked as stale
      const agent = instance.get('test-nonexistent-agent');
      expect(agent?.status).toBe('stale');
    });
  });
});
