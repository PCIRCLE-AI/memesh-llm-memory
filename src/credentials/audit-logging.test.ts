/**
 * Audit Logging Tests
 *
 * Tests for comprehensive audit logging functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CredentialVault } from './CredentialVault.js';
import { AuditEventType, AuditSeverity } from './AuditLogger.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, existsSync } from 'fs';

describe('Audit Logging Tests', () => {
  let vault: CredentialVault;
  let testDbPath: string;

  beforeEach(async () => {
    // Create temporary database for testing
    testDbPath = join(tmpdir(), `test-vault-audit-${Date.now()}.db`);
    vault = new CredentialVault(testDbPath);
    await vault.initialize();
  });

  afterEach(() => {
    vault.close();
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
  });

  describe('Basic Audit Logging', () => {
    it('should log vault initialization', async () => {
      const logs = vault.getAuditLogs();
      const initLogs = logs.filter((log) => log.eventType === AuditEventType.VAULT_INITIALIZED);

      expect(initLogs.length).toBeGreaterThan(0);
      expect(initLogs[0].success).toBe(true);
      expect(initLogs[0].severity).toBe(AuditSeverity.INFO);
    });

    it('should log successful credential add', async () => {
      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.CREDENTIAL_ADDED],
      });

      expect(logs.length).toBe(1);
      expect(logs[0].service).toBe('test-service');
      expect(logs[0].account).toBe('test-user');
      expect(logs[0].success).toBe(true);
      expect(logs[0].severity).toBe(AuditSeverity.INFO);
    });

    it('should log failed credential add (duplicate)', async () => {
      // Add credential first time
      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      // Try to add again (should fail)
      try {
        await vault.add({
          service: 'test-service',
          account: 'test-user',
          value: 'another-password',
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        // Expected
      }

      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.CREDENTIAL_ADDED],
        success: false,
      });

      expect(logs.length).toBe(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].details).toContain('already exists');
    });

    it('should log successful credential retrieval', async () => {
      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      await vault.get('test-service', 'test-user');

      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.CREDENTIAL_RETRIEVED],
      });

      expect(logs.length).toBe(1);
      expect(logs[0].service).toBe('test-service');
      expect(logs[0].account).toBe('test-user');
      expect(logs[0].success).toBe(true);
    });

    it('should log failed credential retrieval (not found)', async () => {
      const cred = await vault.get('test-service', 'nonexistent-user');
      expect(cred).toBeNull();

      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.ACCESS_DENIED_NOT_FOUND],
      });

      expect(logs.length).toBe(1);
      expect(logs[0].service).toBe('test-service');
      expect(logs[0].account).toBe('nonexistent-user');
      expect(logs[0].success).toBe(false);
      expect(logs[0].severity).toBe(AuditSeverity.WARNING);
    });

    it('should log successful credential update', async () => {
      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      await vault.update('test-service', 'test-user', {
        value: 'new-password',
      });

      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.CREDENTIAL_UPDATED],
      });

      expect(logs.length).toBe(1);
      expect(logs[0].service).toBe('test-service');
      expect(logs[0].account).toBe('test-user');
      expect(logs[0].success).toBe(true);
      expect(logs[0].details).toContain('Value updated');
    });

    it('should log successful credential deletion', async () => {
      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'test-password',
      });

      await vault.delete('test-service', 'test-user');

      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.CREDENTIAL_DELETED],
        success: true,
      });

      expect(logs.length).toBe(1);
      expect(logs[0].service).toBe('test-service');
      expect(logs[0].account).toBe('test-user');
      expect(logs[0].success).toBe(true);
    });

    it('should log failed credential deletion (not found)', async () => {
      try {
        await vault.delete('test-service', 'nonexistent-user');
        expect.fail('Should have thrown error');
      } catch (error) {
        // Expected - deletion throws on not found
      }

      // Note: The audit log is written, but since the SQLite transaction
      // might not be committed when the error is thrown, we verify by
      // checking all deletion logs instead
      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.CREDENTIAL_DELETED],
      });

      const failedDeletion = logs.find(
        (log) => log.service === 'test-service' && log.account === 'nonexistent-user' && !log.success
      );

      expect(failedDeletion).toBeDefined();
      if (failedDeletion) {
        expect(failedDeletion.success).toBe(false);
        expect(failedDeletion.details).toContain('not found');
      }
    });
  });

  describe('Validation Failure Logging', () => {
    it('should log validation failure on add', async () => {
      try {
        await vault.add({
          service: 'invalid..service',
          account: 'test-user',
          value: 'test-password',
        });
        expect.fail('Should have thrown error');
      } catch (error) {
        // Expected
      }

      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.ACCESS_DENIED_VALIDATION],
      });

      expect(logs.length).toBe(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].severity).toBe(AuditSeverity.WARNING);
      expect(logs[0].details).toContain('cannot contain');
    });

    it('should log validation failure on get', async () => {
      try {
        await vault.get('test-service', 'user:admin');
        expect.fail('Should have thrown error');
      } catch (error) {
        // Expected
      }

      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.ACCESS_DENIED_VALIDATION],
      });

      expect(logs.length).toBe(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].account).toBe('user:admin');
      expect(logs[0].details).toContain('cannot contain ":"');
    });
  });

  describe('Rate Limit Event Logging', () => {
    it('should log rate limit exceeded', async () => {
      // Lock the account by making 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await vault.get('test-service', 'wrong-user');
      }

      // Try again (should be rate limited)
      try {
        await vault.get('test-service', 'wrong-user');
        expect.fail('Should have thrown rate limit error');
      } catch (error) {
        // Expected
      }

      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.ACCESS_DENIED_RATE_LIMITED],
      });

      expect(logs.length).toBe(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].severity).toBe(AuditSeverity.CRITICAL);
      expect(logs[0].details).toContain('Locked until');
    });

    it('should log admin unlock operation', async () => {
      // Lock the account
      for (let i = 0; i < 5; i++) {
        await vault.get('test-service', 'wrong-user');
      }

      // Admin unlock
      vault.unlockAccount('test-service', 'wrong-user');

      const logs = vault.getAuditLogs({
        eventTypes: [AuditEventType.ADMIN_UNLOCK_ACCOUNT],
      });

      expect(logs.length).toBe(1);
      expect(logs[0].service).toBe('test-service');
      expect(logs[0].account).toBe('wrong-user');
      expect(logs[0].success).toBe(true);
      expect(logs[0].details).toContain('manually unlocked');
    });
  });

  describe('Audit Log Filtering', () => {
    beforeEach(async () => {
      // Create test data
      await vault.add({ service: 'service1', account: 'user1', value: 'pass1' });
      await vault.add({ service: 'service1', account: 'user2', value: 'pass2' });
      await vault.add({ service: 'service2', account: 'user1', value: 'pass3' });

      await vault.get('service1', 'user1');
      await vault.get('service1', 'nonexistent');
    });

    it('should filter by service', async () => {
      const logs = vault.getAuditLogs({
        service: 'service1',
      });

      expect(logs.length).toBeGreaterThan(0);
      for (const log of logs) {
        if (log.service) {
          expect(log.service).toBe('service1');
        }
      }
    });

    it('should filter by account', async () => {
      const logs = vault.getAuditLogs({
        account: 'user1',
      });

      expect(logs.length).toBeGreaterThan(0);
      for (const log of logs) {
        if (log.account) {
          expect(log.account).toBe('user1');
        }
      }
    });

    it('should filter by success status', async () => {
      const successLogs = vault.getAuditLogs({ success: true });
      const failureLogs = vault.getAuditLogs({ success: false });

      expect(successLogs.length).toBeGreaterThan(0);
      expect(failureLogs.length).toBeGreaterThan(0);

      for (const log of successLogs) {
        expect(log.success).toBe(true);
      }

      for (const log of failureLogs) {
        expect(log.success).toBe(false);
      }
    });

    it('should filter by severity', async () => {
      const infoLogs = vault.getAuditLogs({ severity: AuditSeverity.INFO });
      const warningLogs = vault.getAuditLogs({ severity: AuditSeverity.WARNING });

      expect(infoLogs.length).toBeGreaterThan(0);
      expect(warningLogs.length).toBeGreaterThan(0);

      for (const log of infoLogs) {
        expect(log.severity).toBe(AuditSeverity.INFO);
      }

      for (const log of warningLogs) {
        expect(log.severity).toBe(AuditSeverity.WARNING);
      }
    });

    it('should limit results', async () => {
      const logs = vault.getAuditLogs({ limit: 3 });
      expect(logs.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Audit Statistics', () => {
    beforeEach(async () => {
      // Create test data with successes and failures
      await vault.add({ service: 'service1', account: 'user1', value: 'pass1' });
      await vault.get('service1', 'user1'); // Success
      await vault.get('service1', 'nonexistent'); // Failure
    });

    it('should provide audit statistics', async () => {
      const stats = vault.getAuditStats();

      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.successfulEvents).toBeGreaterThan(0);
      expect(stats.failedEvents).toBeGreaterThan(0);
      expect(stats.eventsByType).toBeDefined();
      expect(stats.eventsBySeverity).toBeDefined();
      expect(stats.recentEvents).toBeDefined();
      expect(stats.recentEvents.length).toBeLessThanOrEqual(10);
    });

    it('should count events by type', async () => {
      const stats = vault.getAuditStats();

      expect(stats.eventsByType[AuditEventType.CREDENTIAL_ADDED]).toBeGreaterThan(0);
      expect(stats.eventsByType[AuditEventType.CREDENTIAL_RETRIEVED]).toBeGreaterThan(0);
    });

    it('should count events by severity', async () => {
      const stats = vault.getAuditStats();

      expect(stats.eventsBySeverity[AuditSeverity.INFO]).toBeGreaterThan(0);
      expect(stats.eventsBySeverity[AuditSeverity.WARNING]).toBeGreaterThan(0);
    });
  });

  describe('Audit Log Export', () => {
    beforeEach(async () => {
      await vault.add({ service: 'service1', account: 'user1', value: 'pass1' });
    });

    it('should export audit logs to JSON', async () => {
      const json = vault.exportAuditLogs();

      expect(json).toBeDefined();

      const logs = JSON.parse(json);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);

      // Verify structure
      expect(logs[0]).toHaveProperty('id');
      expect(logs[0]).toHaveProperty('timestamp');
      expect(logs[0]).toHaveProperty('eventType');
      expect(logs[0]).toHaveProperty('severity');
      expect(logs[0]).toHaveProperty('success');
    });

    it('should export filtered logs', async () => {
      const json = vault.exportAuditLogs({
        eventTypes: [AuditEventType.CREDENTIAL_ADDED],
      });

      const logs = JSON.parse(json);
      expect(logs.length).toBeGreaterThan(0);

      for (const log of logs) {
        expect(log.eventType).toBe(AuditEventType.CREDENTIAL_ADDED);
      }
    });
  });

  describe('Retention Management', () => {
    it('should get default retention period', async () => {
      const retention = vault.getAuditRetention();
      expect(retention).toBe(90); // Default 90 days
    });

    it('should set retention period', async () => {
      vault.setAuditRetention(30);
      expect(vault.getAuditRetention()).toBe(30);
    });

    it('should reject invalid retention period', async () => {
      expect(() => vault.setAuditRetention(0)).toThrow(/at least 1/);
      expect(() => vault.setAuditRetention(-1)).toThrow(/at least 1/);
    });
  });

  describe('Vault Lifecycle Events', () => {
    it('should log vault closure', async () => {
      // Close vault
      vault.close();

      // Can't query after close, so create new vault to check logs
      const vault2 = new CredentialVault(testDbPath);
      await vault2.initialize();

      const logs = vault2.getAuditLogs({
        eventTypes: [AuditEventType.VAULT_CLOSED],
      });

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].success).toBe(true);

      vault2.close();
    });
  });
});
