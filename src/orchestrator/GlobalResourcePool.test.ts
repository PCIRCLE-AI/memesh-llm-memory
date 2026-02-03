/**
 * GlobalResourcePool - Validation Tests
 *
 * Tests for NaN/Infinity validation in constructor and methods
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GlobalResourcePool } from './GlobalResourcePool.js';

describe('GlobalResourcePool - Validation', () => {
  afterEach(() => {
    GlobalResourcePool.resetInstance();
  });

  describe('constructor config validation', () => {
    it('should accept valid config', () => {
      const pool = GlobalResourcePool.getInstance({
        cpuThreshold: 70,
        memoryThreshold: 80,
        maxConcurrentE2E: 2,
        e2eWaitTimeout: 300000,
      });
      expect(pool).toBeDefined();
    });

    it('should reject NaN cpuThreshold', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ cpuThreshold: NaN });
      }).toThrow('cpuThreshold must be finite');
    });

    it('should reject Infinity cpuThreshold', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ cpuThreshold: Infinity });
      }).toThrow('cpuThreshold must be finite');
    });

    it('should reject negative cpuThreshold', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ cpuThreshold: -10 });
      }).toThrow('cpuThreshold must be between 0 and 100');
    });

    it('should reject cpuThreshold > 100', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ cpuThreshold: 150 });
      }).toThrow('cpuThreshold must be between 0 and 100');
    });

    it('should reject NaN memoryThreshold', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ memoryThreshold: NaN });
      }).toThrow('memoryThreshold must be finite');
    });

    it('should reject Infinity memoryThreshold', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ memoryThreshold: Infinity });
      }).toThrow('memoryThreshold must be finite');
    });

    it('should reject negative memoryThreshold', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ memoryThreshold: -5 });
      }).toThrow('memoryThreshold must be between 0 and 100');
    });

    it('should reject NaN maxConcurrentE2E', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ maxConcurrentE2E: NaN });
      }).toThrow('maxConcurrentE2E must be finite');
    });

    it('should reject Infinity maxConcurrentE2E', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ maxConcurrentE2E: Infinity });
      }).toThrow('maxConcurrentE2E must be finite');
    });

    it('should reject non-integer maxConcurrentE2E', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ maxConcurrentE2E: 2.5 });
      }).toThrow('maxConcurrentE2E must be a non-negative integer');
    });

    it('should reject negative maxConcurrentE2E', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ maxConcurrentE2E: -1 });
      }).toThrow('maxConcurrentE2E must be a non-negative integer');
    });

    it('should reject NaN e2eWaitTimeout', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ e2eWaitTimeout: NaN });
      }).toThrow('e2eWaitTimeout must be finite');
    });

    it('should reject Infinity e2eWaitTimeout', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ e2eWaitTimeout: Infinity });
      }).toThrow('e2eWaitTimeout must be finite');
    });

    it('should reject negative e2eWaitTimeout', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ e2eWaitTimeout: -1000 });
      }).toThrow('e2eWaitTimeout must be positive');
    });

    it('should reject NaN maxConcurrentBuilds', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ maxConcurrentBuilds: NaN });
      }).toThrow('maxConcurrentBuilds must be finite');
    });

    it('should reject non-integer maxConcurrentBuilds', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ maxConcurrentBuilds: 3.7 });
      }).toThrow('maxConcurrentBuilds must be a non-negative integer');
    });

    it('should reject NaN buildWaitTimeout', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ buildWaitTimeout: NaN });
      }).toThrow('buildWaitTimeout must be finite');
    });

    it('should reject negative buildWaitTimeout', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ buildWaitTimeout: -5000 });
      }).toThrow('buildWaitTimeout must be positive');
    });

    it('should reject NaN staleCheckInterval', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ staleCheckInterval: NaN });
      }).toThrow('staleCheckInterval must be finite');
    });

    it('should reject negative staleCheckInterval', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ staleCheckInterval: -1000 });
      }).toThrow('staleCheckInterval must be positive');
    });

    it('should reject NaN staleLockThreshold', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ staleLockThreshold: NaN });
      }).toThrow('staleLockThreshold must be finite');
    });

    it('should reject negative staleLockThreshold', () => {
      expect(() => {
        GlobalResourcePool.getInstance({ staleLockThreshold: -10000 });
      }).toThrow('staleLockThreshold must be positive');
    });
  });

  describe('canRunE2E validation', () => {
    let pool: GlobalResourcePool;

    beforeEach(() => {
      pool = GlobalResourcePool.getInstance();
    });

    it('should accept valid positive integer', async () => {
      const result = await pool.canRunE2E(2);
      expect(result).toHaveProperty('canRun');
    });

    it('should reject NaN', async () => {
      await expect(pool.canRunE2E(NaN)).rejects.toThrow('count must be finite');
    });

    it('should reject Infinity', async () => {
      await expect(pool.canRunE2E(Infinity)).rejects.toThrow('count must be finite');
    });

    it('should reject negative Infinity', async () => {
      await expect(pool.canRunE2E(-Infinity)).rejects.toThrow('count must be finite');
    });

    it('should reject non-integer', async () => {
      await expect(pool.canRunE2E(2.5)).rejects.toThrow('count must be a positive integer');
    });

    it('should reject zero', async () => {
      await expect(pool.canRunE2E(0)).rejects.toThrow('count must be a positive integer');
    });

    it('should reject negative', async () => {
      await expect(pool.canRunE2E(-1)).rejects.toThrow('count must be a positive integer');
    });
  });

  describe('edge cases', () => {
    it('should handle maximum safe integer for timeouts', () => {
      const pool = GlobalResourcePool.getInstance({
        e2eWaitTimeout: Number.MAX_SAFE_INTEGER,
      });
      expect(pool).toBeDefined();
    });

    it('should handle very small positive timeouts', () => {
      const pool = GlobalResourcePool.getInstance({
        e2eWaitTimeout: 1,
      });
      expect(pool).toBeDefined();
    });
  });
});
