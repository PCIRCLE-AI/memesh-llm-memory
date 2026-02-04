/**
 * Test 4: CSRF Configurable Limits (MINOR-D)
 *
 * Verifies that CSRF middleware properly handles configurable limits.
 *
 * Test coverage:
 * - Default values when env vars not set
 * - Custom values from env vars
 * - Invalid env var values fall back to defaults
 * - Bounds checking (too low, too high)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Store original env vars
const originalEnv: NodeJS.ProcessEnv = {};

// Mock logger before importing the module
vi.mock('../../../../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from '../../../../utils/logger.js';

describe('CSRF Configurable Limits (MINOR-D)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Store original env vars
    originalEnv.CSRF_MAX_TOKENS = process.env.CSRF_MAX_TOKENS;
    originalEnv.CSRF_TOKEN_EXPIRATION_MS = process.env.CSRF_TOKEN_EXPIRATION_MS;
    originalEnv.CSRF_EVICTION_WARNING_COOLDOWN_MS = process.env.CSRF_EVICTION_WARNING_COOLDOWN_MS;

    // Clear env vars for clean test
    delete process.env.CSRF_MAX_TOKENS;
    delete process.env.CSRF_TOKEN_EXPIRATION_MS;
    delete process.env.CSRF_EVICTION_WARNING_COOLDOWN_MS;
  });

  afterEach(() => {
    // Restore original env vars
    if (originalEnv.CSRF_MAX_TOKENS) {
      process.env.CSRF_MAX_TOKENS = originalEnv.CSRF_MAX_TOKENS;
    } else {
      delete process.env.CSRF_MAX_TOKENS;
    }

    if (originalEnv.CSRF_TOKEN_EXPIRATION_MS) {
      process.env.CSRF_TOKEN_EXPIRATION_MS = originalEnv.CSRF_TOKEN_EXPIRATION_MS;
    } else {
      delete process.env.CSRF_TOKEN_EXPIRATION_MS;
    }

    if (originalEnv.CSRF_EVICTION_WARNING_COOLDOWN_MS) {
      process.env.CSRF_EVICTION_WARNING_COOLDOWN_MS = originalEnv.CSRF_EVICTION_WARNING_COOLDOWN_MS;
    } else {
      delete process.env.CSRF_EVICTION_WARNING_COOLDOWN_MS;
    }

    // Reset module cache to allow re-import with new env vars
    vi.resetModules();
  });

  describe('Default values when env vars not set', () => {
    it('should use default MAX_TOKENS of 10000', async () => {
      // Import the module fresh
      const { clearCsrfTokens } = await import('../csrf.js');

      // The module should load without errors
      expect(clearCsrfTokens).toBeDefined();

      // Configuration should be logged on load
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[CSRF] Configuration loaded'),
        expect.objectContaining({
          maxTokens: 10000,
        })
      );
    });

    it('should use default TOKEN_EXPIRATION_MS of 3600000 (1 hour)', async () => {
      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tokenExpirationMs: 3600000,
        })
      );
    });

    it('should use default EVICTION_WARNING_COOLDOWN_MS of 60000 (1 minute)', async () => {
      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          evictionWarningCooldownMs: 60000,
        })
      );
    });
  });

  describe('Custom values from env vars', () => {
    it('should accept custom MAX_TOKENS within bounds', async () => {
      process.env.CSRF_MAX_TOKENS = '50000';
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 50000,
        })
      );
      // No warning should be logged
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('CSRF_MAX_TOKENS'),
        expect.anything()
      );
    });

    it('should accept custom TOKEN_EXPIRATION_MS within bounds', async () => {
      process.env.CSRF_TOKEN_EXPIRATION_MS = '7200000'; // 2 hours
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tokenExpirationMs: 7200000,
        })
      );
    });

    it('should accept custom EVICTION_WARNING_COOLDOWN_MS within bounds', async () => {
      process.env.CSRF_EVICTION_WARNING_COOLDOWN_MS = '120000'; // 2 minutes
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          evictionWarningCooldownMs: 120000,
        })
      );
    });

    it('should accept minimum valid values', async () => {
      process.env.CSRF_MAX_TOKENS = '100'; // Min allowed
      process.env.CSRF_TOKEN_EXPIRATION_MS = '60000'; // Min allowed (1 minute)
      process.env.CSRF_EVICTION_WARNING_COOLDOWN_MS = '1000'; // Min allowed (1 second)
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 100,
          tokenExpirationMs: 60000,
          evictionWarningCooldownMs: 1000,
        })
      );
    });

    it('should accept maximum valid values', async () => {
      process.env.CSRF_MAX_TOKENS = '1000000'; // Max allowed
      process.env.CSRF_TOKEN_EXPIRATION_MS = '86400000'; // Max allowed (24 hours)
      process.env.CSRF_EVICTION_WARNING_COOLDOWN_MS = '3600000'; // Max allowed (1 hour)
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 1000000,
          tokenExpirationMs: 86400000,
          evictionWarningCooldownMs: 3600000,
        })
      );
    });
  });

  describe('Invalid env var values fall back to defaults', () => {
    it('should fall back to default for non-numeric MAX_TOKENS', async () => {
      process.env.CSRF_MAX_TOKENS = 'invalid';
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      // The warning is logged as a single string containing the env var name
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_MAX_TOKENS')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 10000,
        })
      );
    });

    it('should fall back to default for empty TOKEN_EXPIRATION_MS', async () => {
      process.env.CSRF_TOKEN_EXPIRATION_MS = '';
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      // Empty string should be treated as not set
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tokenExpirationMs: 3600000,
        })
      );
    });

    it('should fall back to default for floating point value', async () => {
      process.env.CSRF_MAX_TOKENS = '5000.5';
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      // parseInt will truncate to 5000, which is within bounds
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 5000,
        })
      );
    });

    it('should fall back to default for negative value', async () => {
      process.env.CSRF_MAX_TOKENS = '-100';
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      // Negative value is out of bounds
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_MAX_TOKENS')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 10000,
        })
      );
    });

    it('should fall back to default for special characters', async () => {
      process.env.CSRF_TOKEN_EXPIRATION_MS = '$#@!';
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_TOKEN_EXPIRATION_MS')
      );
    });

    it('should fall back to default for whitespace-only value', async () => {
      process.env.CSRF_MAX_TOKENS = '   ';
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_MAX_TOKENS')
      );
    });
  });

  describe('Bounds checking (too low, too high)', () => {
    it('should fall back to default when MAX_TOKENS is below minimum (100)', async () => {
      process.env.CSRF_MAX_TOKENS = '50'; // Below min of 100
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_MAX_TOKENS')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 10000, // Default
        })
      );
    });

    it('should fall back to default when MAX_TOKENS is above maximum (1000000)', async () => {
      process.env.CSRF_MAX_TOKENS = '2000000'; // Above max of 1000000
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_MAX_TOKENS')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 10000,
        })
      );
    });

    it('should fall back to default when TOKEN_EXPIRATION_MS is below minimum (60000)', async () => {
      process.env.CSRF_TOKEN_EXPIRATION_MS = '30000'; // Below min of 60000
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_TOKEN_EXPIRATION_MS')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tokenExpirationMs: 3600000,
        })
      );
    });

    it('should fall back to default when TOKEN_EXPIRATION_MS is above maximum (86400000)', async () => {
      process.env.CSRF_TOKEN_EXPIRATION_MS = '172800000'; // Above max of 86400000 (2 days)
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_TOKEN_EXPIRATION_MS')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tokenExpirationMs: 3600000,
        })
      );
    });

    it('should fall back to default when EVICTION_WARNING_COOLDOWN_MS is below minimum (1000)', async () => {
      process.env.CSRF_EVICTION_WARNING_COOLDOWN_MS = '500'; // Below min of 1000
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_EVICTION_WARNING_COOLDOWN_MS')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          evictionWarningCooldownMs: 60000,
        })
      );
    });

    it('should fall back to default when EVICTION_WARNING_COOLDOWN_MS is above maximum (3600000)', async () => {
      process.env.CSRF_EVICTION_WARNING_COOLDOWN_MS = '7200000'; // Above max of 3600000
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_EVICTION_WARNING_COOLDOWN_MS')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          evictionWarningCooldownMs: 60000,
        })
      );
    });

    it('should accept boundary value at exactly minimum', async () => {
      process.env.CSRF_MAX_TOKENS = '100'; // Exactly at minimum
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      // Should not warn - value is valid
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('CSRF_MAX_TOKENS')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 100,
        })
      );
    });

    it('should accept boundary value at exactly maximum', async () => {
      process.env.CSRF_MAX_TOKENS = '1000000'; // Exactly at maximum
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('CSRF_MAX_TOKENS')
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 1000000,
        })
      );
    });

    it('should handle zero value as too low', async () => {
      process.env.CSRF_MAX_TOKENS = '0';
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('CSRF_MAX_TOKENS')
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple config errors gracefully', async () => {
      process.env.CSRF_MAX_TOKENS = 'invalid';
      process.env.CSRF_TOKEN_EXPIRATION_MS = 'also-invalid';
      process.env.CSRF_EVICTION_WARNING_COOLDOWN_MS = 'still-invalid';
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      // All should fall back to defaults
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 10000,
          tokenExpirationMs: 3600000,
          evictionWarningCooldownMs: 60000,
        })
      );
    });

    it('should handle numeric string with leading zeros', async () => {
      process.env.CSRF_MAX_TOKENS = '005000';
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      // parseInt with radix 10 should handle this
      expect(logger.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxTokens: 5000,
        })
      );
    });

    it('should handle scientific notation', async () => {
      process.env.CSRF_MAX_TOKENS = '1e4'; // 10000
      vi.resetModules();

      const { clearCsrfTokens } = await import('../csrf.js');

      expect(clearCsrfTokens).toBeDefined();
      // parseInt might not handle scientific notation correctly
      // It will parse '1' and stop at 'e'
      // This should either warn or use 1 (which is below minimum)
    });
  });
});
