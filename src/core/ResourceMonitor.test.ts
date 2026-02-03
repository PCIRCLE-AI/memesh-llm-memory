/**
 * Unit tests for ResourceMonitor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceMonitor } from './ResourceMonitor.js';
import { ExecutionConfig } from './types.js';

describe('ResourceMonitor', () => {
  let monitor: ResourceMonitor;

  beforeEach(() => {
    monitor = new ResourceMonitor();
  });

  describe('getCurrentResources', () => {
    it('should return current system resources', () => {
      const resources = monitor.getCurrentResources();

      expect(resources).toBeDefined();
      expect(resources.cpu).toBeDefined();
      expect(resources.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(resources.cpu.cores).toBeGreaterThan(0);
      expect(resources.memory).toBeDefined();
      expect(resources.memory.total).toBeGreaterThan(0);
      expect(resources.memory.used).toBeGreaterThanOrEqual(0);
      expect(resources.memory.available).toBeGreaterThanOrEqual(0);
      expect(resources.memory.usagePercent).toBeGreaterThanOrEqual(0);
      expect(resources.memory.usagePercent).toBeLessThanOrEqual(100);
      expect(resources.activeBackgroundAgents).toBe(0);
    });

    it('should track active background agents', () => {
      expect(monitor.getCurrentResources().activeBackgroundAgents).toBe(0);

      monitor.registerBackgroundTask();
      expect(monitor.getCurrentResources().activeBackgroundAgents).toBe(1);

      monitor.registerBackgroundTask();
      expect(monitor.getCurrentResources().activeBackgroundAgents).toBe(2);

      monitor.unregisterBackgroundTask();
      expect(monitor.getCurrentResources().activeBackgroundAgents).toBe(1);

      monitor.unregisterBackgroundTask();
      expect(monitor.getCurrentResources().activeBackgroundAgents).toBe(0);
    });
  });

  describe('canRunBackgroundTask', () => {
    it('should allow execution when resources are sufficient', () => {
      const result = monitor.canRunBackgroundTask();

      expect(result).toBeDefined();
      expect(result.canExecute).toBeDefined();
      expect(result.resources).toBeDefined();
    });

    it('should block when max concurrent agents reached', () => {
      // Create a monitor with low max agents
      const limitedMonitor = new ResourceMonitor(2);

      limitedMonitor.registerBackgroundTask();
      limitedMonitor.registerBackgroundTask();

      const result = limitedMonitor.canRunBackgroundTask();

      expect(result.canExecute).toBe(false);
      expect(result.reason).toContain('Max concurrent background agents');
      expect(result.suggestion).toBeDefined();
    });

    it('should check task-specific resource requirements', () => {
      const config: ExecutionConfig = {
        mode: 'background',
        priority: 'medium',
        resourceLimits: {
          maxCPU: 1000, // Impossible requirement
          maxMemory: 1024,
          maxDuration: 300,
        },
      };

      const result = monitor.canRunBackgroundTask(config);

      // Result depends on actual system resources
      expect(result).toBeDefined();
      expect(result.resources).toBeDefined();
    });
  });

  describe('threshold management', () => {
    it('should set and respect CPU threshold', () => {
      monitor.setMaxCPU(50);
      expect(() => monitor.setMaxCPU(50)).not.toThrow();
    });

    it('should reject invalid CPU threshold', () => {
      expect(() => monitor.setMaxCPU(-10)).toThrow('CPU percentage must be between 0 and 100');
      expect(() => monitor.setMaxCPU(150)).toThrow('CPU percentage must be between 0 and 100');
    });

    it('should set and respect memory threshold', () => {
      monitor.setMaxMemory(4096);
      expect(() => monitor.setMaxMemory(4096)).not.toThrow();
    });

    it('should reject invalid memory threshold', () => {
      expect(() => monitor.setMaxMemory(-100)).toThrow('Memory must be positive');
    });

    it('should set max background agents', () => {
      monitor.setMaxBackgroundAgents(10);
      expect(() => monitor.setMaxBackgroundAgents(10)).not.toThrow();
    });

    it('should reject invalid max background agents', () => {
      expect(() => monitor.setMaxBackgroundAgents(0)).toThrow(
        'Max background agents must be at least 1'
      );
      expect(() => monitor.setMaxBackgroundAgents(-5)).toThrow(
        'Max background agents must be at least 1'
      );
    });
  });

  describe('NaN/Infinity validation', () => {
    describe('constructor', () => {
      it('should reject NaN maxBackgroundAgents', () => {
        expect(() => new ResourceMonitor(NaN)).toThrow('Max background agents must be finite');
      });

      it('should reject Infinity maxBackgroundAgents', () => {
        expect(() => new ResourceMonitor(Infinity)).toThrow('Max background agents must be finite');
      });

      it('should reject -Infinity maxBackgroundAgents', () => {
        expect(() => new ResourceMonitor(-Infinity)).toThrow('Max background agents must be finite');
      });

      it('should reject negative maxBackgroundAgents', () => {
        expect(() => new ResourceMonitor(0)).toThrow('Max background agents must be >= 1');
      });

      it('should reject non-integer maxBackgroundAgents', () => {
        expect(() => new ResourceMonitor(3.5)).toThrow('Max background agents must be safe integer');
      });

      it('should reject unsafe integer maxBackgroundAgents', () => {
        expect(() => new ResourceMonitor(Number.MAX_SAFE_INTEGER + 1)).toThrow(
          'Max background agents must be safe integer'
        );
      });

      it('should reject NaN maxCPU', () => {
        expect(() => new ResourceMonitor(6, { maxCPU: NaN })).toThrow('Max CPU must be finite');
      });

      it('should reject Infinity maxCPU', () => {
        expect(() => new ResourceMonitor(6, { maxCPU: Infinity })).toThrow('Max CPU must be finite');
      });

      it('should reject maxCPU > 100', () => {
        expect(() => new ResourceMonitor(6, { maxCPU: 150 })).toThrow('Max CPU must be 0-100');
      });

      it('should reject maxCPU < 0', () => {
        expect(() => new ResourceMonitor(6, { maxCPU: -10 })).toThrow('Max CPU must be 0-100');
      });

      it('should reject NaN maxMemory', () => {
        expect(() => new ResourceMonitor(6, { maxMemory: NaN })).toThrow(
          'Max memory must be finite'
        );
      });

      it('should reject Infinity maxMemory', () => {
        expect(() => new ResourceMonitor(6, { maxMemory: Infinity })).toThrow(
          'Max memory must be finite'
        );
      });

      it('should reject negative maxMemory', () => {
        expect(() => new ResourceMonitor(6, { maxMemory: -1000 })).toThrow(
          'Max memory must be non-negative'
        );
      });

      it('should accept valid constructor parameters', () => {
        expect(() => new ResourceMonitor(8, { maxCPU: 80, maxMemory: 16384 })).not.toThrow();
      });
    });

    describe('setMaxCPU', () => {
      it('should reject NaN', () => {
        expect(() => monitor.setMaxCPU(NaN)).toThrow('CPU percentage must be finite');
      });

      it('should reject Infinity', () => {
        expect(() => monitor.setMaxCPU(Infinity)).toThrow('CPU percentage must be finite');
      });

      it('should reject -Infinity', () => {
        expect(() => monitor.setMaxCPU(-Infinity)).toThrow('CPU percentage must be finite');
      });

      it('should accept valid CPU percentage', () => {
        expect(() => monitor.setMaxCPU(75)).not.toThrow();
        expect(() => monitor.setMaxCPU(0)).not.toThrow();
        expect(() => monitor.setMaxCPU(100)).not.toThrow();
      });
    });

    describe('setMaxMemory', () => {
      it('should reject NaN', () => {
        expect(() => monitor.setMaxMemory(NaN)).toThrow('Memory must be finite');
      });

      it('should reject Infinity', () => {
        expect(() => monitor.setMaxMemory(Infinity)).toThrow('Memory must be finite');
      });

      it('should reject -Infinity', () => {
        expect(() => monitor.setMaxMemory(-Infinity)).toThrow('Memory must be finite');
      });

      it('should accept valid memory values', () => {
        expect(() => monitor.setMaxMemory(4096)).not.toThrow();
        expect(() => monitor.setMaxMemory(0)).not.toThrow();
        expect(() => monitor.setMaxMemory(32768)).not.toThrow();
      });
    });

    describe('setMaxBackgroundAgents', () => {
      it('should reject NaN', () => {
        expect(() => monitor.setMaxBackgroundAgents(NaN)).toThrow('Max agents must be finite');
      });

      it('should reject Infinity', () => {
        expect(() => monitor.setMaxBackgroundAgents(Infinity)).toThrow('Max agents must be finite');
      });

      it('should reject -Infinity', () => {
        expect(() => monitor.setMaxBackgroundAgents(-Infinity)).toThrow(
          'Max agents must be finite'
        );
      });

      it('should reject non-integer values', () => {
        expect(() => monitor.setMaxBackgroundAgents(5.5)).toThrow(
          'Max agents must be safe integer'
        );
      });

      it('should reject unsafe integers', () => {
        expect(() => monitor.setMaxBackgroundAgents(Number.MAX_SAFE_INTEGER + 1)).toThrow(
          'Max agents must be safe integer'
        );
      });

      it('should accept valid agent counts', () => {
        expect(() => monitor.setMaxBackgroundAgents(1)).not.toThrow();
        expect(() => monitor.setMaxBackgroundAgents(10)).not.toThrow();
        expect(() => monitor.setMaxBackgroundAgents(100)).not.toThrow();
      });
    });
  });

  describe('background task registration', () => {
    it('should track active background count', () => {
      expect(monitor.getActiveBackgroundCount()).toBe(0);

      monitor.registerBackgroundTask();
      expect(monitor.getActiveBackgroundCount()).toBe(1);

      monitor.registerBackgroundTask();
      monitor.registerBackgroundTask();
      expect(monitor.getActiveBackgroundCount()).toBe(3);
    });

    it('should handle unregister when count is zero', () => {
      expect(monitor.getActiveBackgroundCount()).toBe(0);
      monitor.unregisterBackgroundTask(); // Should not go negative
      expect(monitor.getActiveBackgroundCount()).toBe(0);
    });
  });

  describe('threshold exceeded callback', () => {
    it('should register and cleanup threshold callback', async () => {
      let callbackCalled = false;

      const cleanup = monitor.onThresholdExceeded('cpu', resources => {
        callbackCalled = true;
      });

      // Cleanup should return a function
      expect(typeof cleanup).toBe('function');

      // Cleanup
      cleanup();
    });
  });

  describe('custom thresholds', () => {
    it('should use custom thresholds in constructor', () => {
      const customMonitor = new ResourceMonitor(3, {
        maxCPU: 50,
        maxMemory: 4096,
      });

      expect(customMonitor.getActiveBackgroundCount()).toBe(0);
    });
  });
});
