/**
 * Rate Limiting Tests
 *
 * Tests for credential vault rate limiting functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CredentialVault } from './CredentialVault.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, existsSync } from 'fs';

describe('Rate Limiting Tests', () => {
  let vault: CredentialVault;
  let testDbPath: string;

  beforeEach(async () => {
    // Create temporary database for testing
    testDbPath = join(tmpdir(), `test-vault-ratelimit-${Date.now()}.db`);
    vault = new CredentialVault(testDbPath);
    await vault.initialize();

    // Add a test credential
    await vault.add({
      service: 'test-service',
      account: 'test-user',
      value: 'test-password',
    });
  });

  afterEach(() => {
    vault.close();
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
  });

  describe('Basic Rate Limiting', () => {
    it('should allow successful credential retrieval', async () => {
      const cred = await vault.get('test-service', 'test-user');
      expect(cred).toBeDefined();
      expect(cred?.value).toBe('test-password');

      // Check rate limit status - should be reset after successful attempt
      const status = vault.getRateLimitStatus('test-service', 'test-user');
      expect(status.isLocked).toBe(false);
      expect(status.attempts).toBe(0);
    });

    it('should track failed attempts for non-existent credentials', async () => {
      // First attempt
      const cred1 = await vault.get('test-service', 'wrong-user');
      expect(cred1).toBeNull();

      // Check status after first failed attempt
      const status1 = vault.getRateLimitStatus('test-service', 'wrong-user');
      expect(status1.attempts).toBe(1);
      expect(status1.isLocked).toBe(false);
      expect(status1.remainingAttempts).toBe(4); // 5 max - 1 attempt = 4 remaining

      // Second attempt
      const cred2 = await vault.get('test-service', 'wrong-user');
      expect(cred2).toBeNull();

      // Check status after second failed attempt
      const status2 = vault.getRateLimitStatus('test-service', 'wrong-user');
      expect(status2.attempts).toBe(2);
      expect(status2.remainingAttempts).toBe(3);
    });

    it('should lock account after max failed attempts', async () => {
      // Make 5 failed attempts (max)
      for (let i = 0; i < 5; i++) {
        await vault.get('test-service', 'wrong-user');
      }

      // Check status - should be locked
      const status = vault.getRateLimitStatus('test-service', 'wrong-user');
      expect(status.isLocked).toBe(true);
      expect(status.lockedUntil).toBeDefined();
      expect(status.attempts).toBe(5);

      // Next attempt should throw error
      await expect(
        vault.get('test-service', 'wrong-user')
      ).rejects.toThrow(/Rate limit exceeded/);
    });

    it('should provide retry information when locked', async () => {
      // Lock the account
      for (let i = 0; i < 5; i++) {
        await vault.get('test-service', 'wrong-user');
      }

      // Try to access again
      try {
        await vault.get('test-service', 'wrong-user');
        expect.fail('Should have thrown rate limit error');
      } catch (error) {
        const errorMsg = (error as Error).message;
        expect(errorMsg).toContain('Rate limit exceeded');
        expect(errorMsg).toContain('locked until');
        expect(errorMsg).toContain('Retry after');
      }
    });

    it('should reset counter on successful attempt', async () => {
      // Make 2 failed attempts
      await vault.get('test-service', 'wrong-user');
      await vault.get('test-service', 'wrong-user');

      const status1 = vault.getRateLimitStatus('test-service', 'wrong-user');
      expect(status1.attempts).toBe(2);

      // Make a successful attempt with correct user
      const cred = await vault.get('test-service', 'test-user');
      expect(cred).toBeDefined();

      // The successful attempt should reset counter for test-user
      const statusCorrect = vault.getRateLimitStatus('test-service', 'test-user');
      expect(statusCorrect.attempts).toBe(0);

      // But wrong-user should still have 2 attempts
      const status2 = vault.getRateLimitStatus('test-service', 'wrong-user');
      expect(status2.attempts).toBe(2);
    });
  });

  describe('Admin Operations', () => {
    it('should allow manual unlock of locked accounts', async () => {
      // Lock the account
      for (let i = 0; i < 5; i++) {
        await vault.get('test-service', 'wrong-user');
      }

      // Verify locked
      const status1 = vault.getRateLimitStatus('test-service', 'wrong-user');
      expect(status1.isLocked).toBe(true);

      // Unlock
      vault.unlockAccount('test-service', 'wrong-user');

      // Verify unlocked
      const status2 = vault.getRateLimitStatus('test-service', 'wrong-user');
      expect(status2.isLocked).toBe(false);
      expect(status2.attempts).toBe(0);

      // Should be able to access now (though will fail as credential doesn't exist)
      const cred = await vault.get('test-service', 'wrong-user');
      expect(cred).toBeNull();
    });

    it('should list all locked accounts', async () => {
      // Lock multiple accounts
      for (let i = 0; i < 5; i++) {
        await vault.get('test-service', 'user1');
      }

      for (let i = 0; i < 5; i++) {
        await vault.get('test-service', 'user2');
      }

      // Get locked accounts
      const locked = vault.getLockedAccounts();
      expect(locked.length).toBe(2);
      expect(locked.map(l => l.account).sort()).toEqual(['user1', 'user2']);

      for (const account of locked) {
        expect(account.service).toBe('test-service');
        expect(account.lockedUntil).toBeInstanceOf(Date);
        expect(account.attempts).toBe(5);
      }
    });

    it('should provide rate limiting statistics', async () => {
      // Make some failed attempts
      for (let i = 0; i < 3; i++) {
        await vault.get('test-service', 'user1');
      }

      for (let i = 0; i < 5; i++) {
        await vault.get('test-service', 'user2');
      }

      const stats = vault.getRateLimitStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.lockedAccounts).toBe(1); // user2 is locked (5 attempts)
      expect(stats.totalAttempts).toBe(8); // 3 + 5 = 8
    });
  });

  describe('Different Services and Accounts', () => {
    it('should track rate limits separately per service/account combination', async () => {
      // Different combinations
      await vault.get('service1', 'user1');
      await vault.get('service1', 'user2');
      await vault.get('service2', 'user1');

      const stats = vault.getRateLimitStats();
      expect(stats.totalEntries).toBe(3);
    });

    it('should not affect rate limits across different services', async () => {
      // Add another credential
      await vault.add({
        service: 'service2',
        account: 'test-user',
        value: 'password2',
      });

      // Lock service1
      for (let i = 0; i < 5; i++) {
        await vault.get('test-service', 'wrong-user');
      }

      // service1 should be locked
      const status1 = vault.getRateLimitStatus('test-service', 'wrong-user');
      expect(status1.isLocked).toBe(true);

      // service2 should not be affected
      const status2 = vault.getRateLimitStatus('service2', 'test-user');
      expect(status2.isLocked).toBe(false);
      expect(status2.attempts).toBe(0);

      // Should be able to access service2 credential
      const cred = await vault.get('service2', 'test-user');
      expect(cred).toBeDefined();
    });
  });

  describe('Successful Attempt After Failures', () => {
    it('should reset counter when credential is finally found', async () => {
      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await vault.get('test-service', 'test-user-wrong');
      }

      const status1 = vault.getRateLimitStatus('test-service', 'test-user-wrong');
      expect(status1.attempts).toBe(3);

      // Now try with correct account (different account though)
      const cred = await vault.get('test-service', 'test-user');
      expect(cred).toBeDefined();

      // The successful attempt should reset counter for test-user
      const status2 = vault.getRateLimitStatus('test-service', 'test-user');
      expect(status2.attempts).toBe(0);
    });
  });
});
