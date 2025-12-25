/**
 * Rotation Policy Tests
 *
 * Tests for comprehensive credential rotation policy functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CredentialVault } from './CredentialVault.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, existsSync } from 'fs';

describe('Rotation Policy Tests', () => {
  let vault: CredentialVault;
  let testDbPath: string;

  beforeEach(async () => {
    // Create temporary database for testing
    testDbPath = join(tmpdir(), `test-vault-rotation-${Date.now()}.db`);
    vault = new CredentialVault(testDbPath);
    await vault.initialize();
  });

  afterEach(() => {
    vault.close();
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
  });

  describe('Basic Rotation Policy Operations', () => {
    it('should create a rotation policy', () => {
      const policy = vault.createRotationPolicy({
        name: 'test-policy',
        servicePattern: 'test:*',
        maxAgeDays: 90,
        warningDays: 7,
        enforceRotation: true,
        autoArchive: false,
      });

      expect(policy.id).toBeDefined();
      expect(policy.name).toBe('test-policy');
      expect(policy.servicePattern).toBe('test:*');
      expect(policy.maxAgeDays).toBe(90);
      expect(policy.warningDays).toBe(7);
      expect(policy.enforceRotation).toBe(true);
      expect(policy.autoArchive).toBe(false);
    });

    it('should get a rotation policy by ID', () => {
      const created = vault.createRotationPolicy({
        name: 'get-test',
        servicePattern: 'api:*',
        maxAgeDays: 60,
        warningDays: 5,
        enforceRotation: false,
        autoArchive: true,
      });

      const retrieved = vault.getRotationPolicy(created.id!);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('get-test');
      expect(retrieved?.maxAgeDays).toBe(60);
    });

    it('should get a rotation policy by name', () => {
      vault.createRotationPolicy({
        name: 'named-policy',
        servicePattern: 'prod:*',
        maxAgeDays: 30,
        warningDays: 3,
        enforceRotation: true,
        autoArchive: false,
      });

      const retrieved = vault.getRotationPolicyByName('named-policy');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('named-policy');
    });

    it('should list all rotation policies', () => {
      vault.createRotationPolicy({
        name: 'policy-1',
        servicePattern: 'service1:*',
        maxAgeDays: 90,
        warningDays: 7,
        enforceRotation: true,
        autoArchive: false,
      });

      vault.createRotationPolicy({
        name: 'policy-2',
        servicePattern: 'service2:*',
        maxAgeDays: 60,
        warningDays: 5,
        enforceRotation: false,
        autoArchive: true,
      });

      const policies = vault.listRotationPolicies();
      expect(policies.length).toBe(2);
      expect(policies.map((p) => p.name)).toContain('policy-1');
      expect(policies.map((p) => p.name)).toContain('policy-2');
    });

    it('should update a rotation policy', () => {
      const policy = vault.createRotationPolicy({
        name: 'update-test',
        servicePattern: 'test:*',
        maxAgeDays: 90,
        warningDays: 7,
        enforceRotation: false,
        autoArchive: false,
      });

      vault.updateRotationPolicy(policy.id!, {
        maxAgeDays: 120,
        warningDays: 10,
        enforceRotation: true,
      });

      const updated = vault.getRotationPolicy(policy.id!);
      expect(updated?.maxAgeDays).toBe(120);
      expect(updated?.warningDays).toBe(10);
      expect(updated?.enforceRotation).toBe(true);
      expect(updated?.name).toBe('update-test'); // Unchanged
    });

    it('should delete a rotation policy', () => {
      const policy = vault.createRotationPolicy({
        name: 'delete-test',
        servicePattern: 'test:*',
        maxAgeDays: 90,
        warningDays: 7,
        enforceRotation: false,
        autoArchive: false,
      });

      vault.deleteRotationPolicy(policy.id!);

      const retrieved = vault.getRotationPolicy(policy.id!);
      expect(retrieved).toBeNull();
    });
  });

  describe('Policy Validation', () => {
    it('should reject policy with empty name', () => {
      expect(() =>
        vault.createRotationPolicy({
          name: '',
          servicePattern: 'test:*',
          maxAgeDays: 90,
          warningDays: 7,
          enforceRotation: false,
          autoArchive: false,
        })
      ).toThrow(/name is required/i);
    });

    it('should reject policy with empty service pattern', () => {
      expect(() =>
        vault.createRotationPolicy({
          name: 'test',
          servicePattern: '',
          maxAgeDays: 90,
          warningDays: 7,
          enforceRotation: false,
          autoArchive: false,
        })
      ).toThrow(/service pattern is required/i);
    });

    it('should reject policy with maxAgeDays < 1', () => {
      expect(() =>
        vault.createRotationPolicy({
          name: 'test',
          servicePattern: 'test:*',
          maxAgeDays: 0,
          warningDays: 7,
          enforceRotation: false,
          autoArchive: false,
        })
      ).toThrow(/at least 1 day/i);
    });

    it('should reject policy with negative warningDays', () => {
      expect(() =>
        vault.createRotationPolicy({
          name: 'test',
          servicePattern: 'test:*',
          maxAgeDays: 90,
          warningDays: -1,
          enforceRotation: false,
          autoArchive: false,
        })
      ).toThrow(/cannot be negative/i);
    });

    it('should reject policy with warningDays >= maxAgeDays', () => {
      expect(() =>
        vault.createRotationPolicy({
          name: 'test',
          servicePattern: 'test:*',
          maxAgeDays: 90,
          warningDays: 90,
          enforceRotation: false,
          autoArchive: false,
        })
      ).toThrow(/must be less than max age/i);
    });
  });

  describe('Policy Assignment and Status', () => {
    it('should assign a policy to a credential', async () => {
      // Create policy
      const policy = vault.createRotationPolicy({
        name: 'assign-test',
        servicePattern: 'test:*',
        maxAgeDays: 90,
        warningDays: 7,
        enforceRotation: false,
        autoArchive: false,
      });

      // Create credential
      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      // Assign policy
      vault.assignRotationPolicy('test-service', 'test-user', policy.id!);

      // Check status
      const status = vault.checkRotationStatus('test-service', 'test-user');
      expect(status.policy).toBeDefined();
      expect(status.policy?.name).toBe('assign-test');
    });

    it('should check rotation status for fresh credential', async () => {
      const policy = vault.createRotationPolicy({
        name: 'fresh-test',
        servicePattern: 'test:*',
        maxAgeDays: 90,
        warningDays: 7,
        enforceRotation: false,
        autoArchive: false,
      });

      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      vault.assignRotationPolicy('test-service', 'test-user', policy.id!);

      const status = vault.checkRotationStatus('test-service', 'test-user');

      expect(status.needsRotation).toBe(false);
      expect(status.isExpired).toBe(false);
      expect(status.ageInDays).toBe(0);
      expect(status.daysUntilExpiration).toBeGreaterThan(80); // ~90 days
    });

    it('should return non-expiring status for credential without policy', async () => {
      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      const status = vault.checkRotationStatus('test-service', 'test-user');

      expect(status.needsRotation).toBe(false);
      expect(status.isExpired).toBe(false);
      expect(status.daysUntilExpiration).toBe(Infinity);
    });
  });

  describe('Rotation Enforcement', () => {
    it('should block access to expired credential when enforced', async () => {
      // Create policy with very short max age (1 day) for testing
      const policy = vault.createRotationPolicy({
        name: 'strict-policy',
        servicePattern: 'test:*',
        maxAgeDays: 1,
        warningDays: 0,
        enforceRotation: true,
        autoArchive: false,
      });

      // Create credential
      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      vault.assignRotationPolicy('test-service', 'test-user', policy.id!);

      // Manually update created_at to 2 days ago
      const vault_db = (vault as any).db;
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
      vault_db
        .prepare('UPDATE credentials SET created_at = ? WHERE service = ? AND account = ?')
        .run(twoDaysAgo, 'test-service', 'test-user');

      // Check status
      const status = vault.checkRotationStatus('test-service', 'test-user');
      expect(status.isExpired).toBe(true);
      expect(status.policy?.enforceRotation).toBe(true);

      // Try to get credential (should fail)
      await expect(vault.get('test-service', 'test-user')).rejects.toThrow(/expired/i);
    });

    it('should allow access to expired credential when not enforced', async () => {
      // Create policy with enforcement disabled
      const policy = vault.createRotationPolicy({
        name: 'lenient-policy',
        servicePattern: 'test:*',
        maxAgeDays: 1,
        warningDays: 0,
        enforceRotation: false,
        autoArchive: false,
      });

      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      vault.assignRotationPolicy('test-service', 'test-user', policy.id!);

      // Manually update created_at to 2 days ago
      const vault_db = (vault as any).db;
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
      vault_db
        .prepare('UPDATE credentials SET created_at = ? WHERE service = ? AND account = ?')
        .run(twoDaysAgo, 'test-service', 'test-user');

      // Should still allow access but log warning
      const credential = await vault.get('test-service', 'test-user');
      expect(credential).toBeDefined();
      expect(credential?.value).toBe('test-password');
    });
  });

  describe('Mark as Rotated', () => {
    it('should update last_rotated timestamp', async () => {
      const policy = vault.createRotationPolicy({
        name: 'rotation-test',
        servicePattern: 'test:*',
        maxAgeDays: 90,
        warningDays: 7,
        enforceRotation: false,
        autoArchive: false,
      });

      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      vault.assignRotationPolicy('test-service', 'test-user', policy.id!);

      // Manually update created_at to 85 days ago (should need rotation soon)
      const vault_db = (vault as any).db;
      const oldDate = Date.now() - 85 * 24 * 60 * 60 * 1000;
      vault_db
        .prepare('UPDATE credentials SET created_at = ? WHERE service = ? AND account = ?')
        .run(oldDate, 'test-service', 'test-user');

      // Check status before rotation
      let status = vault.checkRotationStatus('test-service', 'test-user');
      expect(status.needsRotation).toBe(true);
      expect(status.daysUntilExpiration).toBeLessThan(10);

      // Mark as rotated
      vault.markCredentialAsRotated('test-service', 'test-user');

      // Check status after rotation
      status = vault.checkRotationStatus('test-service', 'test-user');
      expect(status.needsRotation).toBe(false);
      expect(status.daysUntilExpiration).toBeGreaterThan(80); // Reset to ~90 days
      expect(status.lastRotated).toBeDefined();
    });
  });

  describe('Service Pattern Matching', () => {
    it('should match exact service name', async () => {
      vault.createRotationPolicy({
        name: 'exact-match',
        servicePattern: 'production-api',
        maxAgeDays: 60,
        warningDays: 5,
        enforceRotation: true,
        autoArchive: false,
      });

      await vault.add({
        service: 'production-api',
        account: 'key-1',
        value: 'secret',
      });

      const status = vault.checkRotationStatus('production-api', 'key-1');
      expect(status.policy).toBeDefined();
      expect(status.policy?.name).toBe('exact-match');
    });

    it('should match wildcard pattern', async () => {
      vault.createRotationPolicy({
        name: 'wildcard-match',
        servicePattern: 'production-*',
        maxAgeDays: 60,
        warningDays: 5,
        enforceRotation: true,
        autoArchive: false,
      });

      await vault.add({
        service: 'production-api-1',
        account: 'key-1',
        value: 'secret',
      });

      await vault.add({
        service: 'production-api-2',
        account: 'key-2',
        value: 'secret2',
      });

      const status1 = vault.checkRotationStatus('production-api-1', 'key-1');
      expect(status1.policy?.name).toBe('wildcard-match');

      const status2 = vault.checkRotationStatus('production-api-2', 'key-2');
      expect(status2.policy?.name).toBe('wildcard-match');
    });

    it('should prefer more specific pattern match', async () => {
      // Create general policy
      vault.createRotationPolicy({
        name: 'general',
        servicePattern: 'production-*',
        maxAgeDays: 90,
        warningDays: 7,
        enforceRotation: false,
        autoArchive: false,
      });

      // Create more specific policy
      vault.createRotationPolicy({
        name: 'specific',
        servicePattern: 'production-critical-*',
        maxAgeDays: 30,
        warningDays: 3,
        enforceRotation: true,
        autoArchive: false,
      });

      await vault.add({
        service: 'production-critical-api',
        account: 'key-1',
        value: 'secret',
      });

      const status = vault.checkRotationStatus('production-critical-api', 'key-1');
      expect(status.policy?.name).toBe('specific'); // Should use more specific policy
      expect(status.policy?.maxAgeDays).toBe(30);
    });
  });

  describe('Credentials Needing Rotation', () => {
    it('should list credentials needing rotation', async () => {
      const policy = vault.createRotationPolicy({
        name: 'list-test',
        servicePattern: 'test:*',
        maxAgeDays: 90,
        warningDays: 10,
        enforceRotation: false,
        autoArchive: false,
      });

      // Create credential that needs rotation
      await vault.add({
        service: 'test-service-1',
        account: 'user-1',
        value: 'password-1',
      });

      // Create credential that doesn't need rotation
      await vault.add({
        service: 'test-service-2',
        account: 'user-2',
        value: 'password-2',
      });

      vault.assignRotationPolicy('test-service-1', 'user-1', policy.id!);
      vault.assignRotationPolicy('test-service-2', 'user-2', policy.id!);

      // Make service-1 old (85 days ago, within warning period)
      const vault_db = (vault as any).db;
      const oldDate = Date.now() - 85 * 24 * 60 * 60 * 1000;
      vault_db
        .prepare('UPDATE credentials SET created_at = ? WHERE service = ? AND account = ?')
        .run(oldDate, 'test-service-1', 'user-1');

      const needingRotation = vault.listCredentialsNeedingRotation();

      expect(needingRotation.length).toBeGreaterThan(0);
      const cred1 = needingRotation.find((c) => c.service === 'test-service-1');
      expect(cred1).toBeDefined();
      expect(cred1?.status.needsRotation).toBe(true);
    });
  });

  describe('Rotation Statistics', () => {
    it('should provide rotation statistics', async () => {
      const policy = vault.createRotationPolicy({
        name: 'stats-test',
        servicePattern: 'test:*',
        maxAgeDays: 90,
        warningDays: 10,
        enforceRotation: false,
        autoArchive: false,
      });

      // Create multiple credentials
      await vault.add({ service: 'test-1', account: 'user-1', value: 'pass-1' });
      await vault.add({ service: 'test-2', account: 'user-2', value: 'pass-2' });
      await vault.add({ service: 'test-3', account: 'user-3', value: 'pass-3' });

      vault.assignRotationPolicy('test-1', 'user-1', policy.id!);
      vault.assignRotationPolicy('test-2', 'user-2', policy.id!);
      vault.assignRotationPolicy('test-3', 'user-3', policy.id!);

      // Make test-1 need rotation (85 days old)
      const vault_db = (vault as any).db;
      vault_db
        .prepare('UPDATE credentials SET created_at = ? WHERE service = ?')
        .run(Date.now() - 85 * 24 * 60 * 60 * 1000, 'test-1');

      // Make test-2 expired (95 days old)
      vault_db
        .prepare('UPDATE credentials SET created_at = ? WHERE service = ?')
        .run(Date.now() - 95 * 24 * 60 * 60 * 1000, 'test-2');

      const stats = vault.getRotationStats();

      expect(stats.totalCredentials).toBeGreaterThanOrEqual(3);
      expect(stats.needsRotation).toBeGreaterThanOrEqual(2); // test-1 and test-2
      expect(stats.expired).toBeGreaterThanOrEqual(1); // test-2
      expect(stats.averageAge).toBeGreaterThan(0);
      expect(stats.oldestCredential).toBeDefined();
    });
  });
});
