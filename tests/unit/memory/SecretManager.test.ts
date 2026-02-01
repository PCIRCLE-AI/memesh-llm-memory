/**
 * SecretManager Tests
 *
 * TDD tests for secure secret storage.
 *
 * Test coverage:
 * - detectSecrets() - finds API keys, tokens, passwords
 * - maskValue() - properly masks sensitive values
 * - store() - encrypts and saves to database
 * - get() - decrypts and returns value
 * - update() - modifies existing secret
 * - delete() - removes secret
 * - list() - returns names without values
 * - requestConfirmation() - returns proper i18n keys
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecretManager } from '../../../src/memory/SecretManager.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { DetectedSecret, SecretType } from '../../../src/memory/types/secret-types.js';

describe('SecretManager', () => {
  let secretManager: SecretManager;
  let tempDir: string;
  let dbPath: string;

  beforeEach(async () => {
    // Create temp directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'secret-manager-test-'));
    dbPath = join(tempDir, 'test-secrets.db');

    // Create SecretManager instance
    secretManager = await SecretManager.create(dbPath);
  });

  afterEach(() => {
    // Close database and cleanup
    secretManager.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectSecrets()', () => {
    it('should detect OpenAI API keys', () => {
      const content = 'My API key is sk-abc123def456ghi789jkl012mno345pqr678';
      const secrets = secretManager.detectSecrets(content);

      expect(secrets.length).toBe(1);
      expect(secrets[0].type).toBe('api_key');
      expect(secrets[0].value).toContain('sk-');
      expect(secrets[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should detect GitHub Personal Access Tokens', () => {
      const content = 'Use ghp_abcdefghijklmnopqrstuvwxyz1234567890 for auth';
      const secrets = secretManager.detectSecrets(content);

      expect(secrets.length).toBeGreaterThanOrEqual(1);
      expect(secrets.some((s) => s.type === 'api_key' && s.value.includes('ghp_'))).toBe(true);
    });

    it('should detect AWS Access Key IDs', () => {
      const content = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
      const secrets = secretManager.detectSecrets(content);

      expect(secrets.length).toBe(1);
      expect(secrets[0].type).toBe('api_key');
      expect(secrets[0].value).toContain('AKIA');
    });

    it('should detect Bearer tokens', () => {
      const content = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const secrets = secretManager.detectSecrets(content);

      expect(secrets.length).toBeGreaterThanOrEqual(1);
      expect(secrets.some((s) => s.type === 'bearer_token' || s.type === 'jwt')).toBe(true);
    });

    it('should detect JWT tokens', () => {
      const content =
        'token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const secrets = secretManager.detectSecrets(content);

      expect(secrets.length).toBeGreaterThanOrEqual(1);
      expect(secrets.some((s) => s.type === 'jwt')).toBe(true);
    });

    it('should detect password patterns in config', () => {
      const content = `
        database:
          password: "my_super_secret_password123"
          host: localhost
      `;
      const secrets = secretManager.detectSecrets(content);

      expect(secrets.length).toBeGreaterThanOrEqual(1);
      expect(secrets.some((s) => s.type === 'password')).toBe(true);
    });

    it('should detect multiple secrets in content', () => {
      const content = `
        sk-abc123def456ghi789jkl012mno345pqr678
        ghp_abcdefghijklmnopqrstuvwxyz1234567890
      `;
      const secrets = secretManager.detectSecrets(content);

      // Should detect at least 2 secrets (OpenAI API key and GitHub PAT)
      expect(secrets.length).toBeGreaterThanOrEqual(2);
      expect(secrets.some((s) => s.value.includes('sk-'))).toBe(true);
      expect(secrets.some((s) => s.value.includes('ghp_'))).toBe(true);
    });

    it('should return empty array for content with no secrets', () => {
      const content = 'This is just regular text without any secrets.';
      const secrets = secretManager.detectSecrets(content);

      expect(secrets).toEqual([]);
    });

    it('should include position information', () => {
      const content = 'Key: sk-abc123def456ghi789jkl012mno345pqr678';
      const secrets = secretManager.detectSecrets(content);

      expect(secrets[0].startIndex).toBeGreaterThanOrEqual(0);
      expect(secrets[0].endIndex).toBeGreaterThan(secrets[0].startIndex);
    });
  });

  describe('maskValue()', () => {
    it('should mask short values completely', () => {
      const masked = secretManager.maskValue('abc');
      expect(masked).toBe('***');
    });

    it('should mask medium values with first and last char', () => {
      const masked = secretManager.maskValue('abcdefgh');
      expect(masked).toBe('a******h');
    });

    it('should mask long values with first4 and last4', () => {
      const masked = secretManager.maskValue('sk-abc123def456ghi789jkl012mno345pqr678');
      expect(masked).toBe('sk-a****r678');
    });

    it('should handle empty string', () => {
      const masked = secretManager.maskValue('');
      expect(masked).toBe('');
    });
  });

  describe('store()', () => {
    it('should store a secret and return an ID', async () => {
      const id = await secretManager.store('my-secret-value', {
        name: 'test-api-key',
        secretType: 'api_key',
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should encrypt the value (not store plain text)', async () => {
      const plainValue = 'my-super-secret-value';
      const id = await secretManager.store(plainValue, {
        name: 'test-secret',
      });

      // Get raw stored data to verify encryption
      const storedData = secretManager.getStoredData(id);

      expect(storedData).not.toBeNull();
      expect(storedData!.encryptedValue).not.toBe(plainValue);
      expect(storedData!.iv).toBeDefined();
      expect(storedData!.authTag).toBeDefined();
    });

    it('should store with custom expiration', async () => {
      const id = await secretManager.store('value', {
        name: 'expiring-secret',
        expiresInSeconds: 3600, // 1 hour
      });

      const storedData = secretManager.getStoredData(id);

      expect(storedData!.expiresAt).toBeDefined();
      const expiresAt = new Date(storedData!.expiresAt!);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();

      // Should expire in approximately 1 hour (with some tolerance)
      expect(diffMs).toBeGreaterThan(3500 * 1000);
      expect(diffMs).toBeLessThan(3700 * 1000);
    });

    it('should store with metadata', async () => {
      const id = await secretManager.store('value', {
        name: 'secret-with-metadata',
        metadata: { source: 'test', environment: 'development' },
      });

      const storedData = secretManager.getStoredData(id);

      expect(storedData!.metadata).toEqual({
        source: 'test',
        environment: 'development',
      });
    });

    it('should not allow duplicate names', async () => {
      await secretManager.store('value1', { name: 'unique-name' });

      await expect(secretManager.store('value2', { name: 'unique-name' })).rejects.toThrow();
    });
  });

  describe('get()', () => {
    it('should decrypt and return the stored value', async () => {
      const originalValue = 'my-secret-api-key-12345';
      const id = await secretManager.store(originalValue, {
        name: 'get-test-secret',
      });

      const retrievedValue = await secretManager.get(id);

      expect(retrievedValue).toBe(originalValue);
    });

    it('should return null for non-existent ID', async () => {
      const value = await secretManager.get('non-existent-id');
      expect(value).toBeNull();
    });

    it('should return null for expired secrets', async () => {
      const id = await secretManager.store('value', {
        name: 'short-lived-secret',
        expiresInSeconds: 1, // 1 second
      });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const value = await secretManager.get(id);
      expect(value).toBeNull();
    });
  });

  describe('getByName()', () => {
    it('should retrieve secret by name', async () => {
      const originalValue = 'secret-by-name-value';
      await secretManager.store(originalValue, {
        name: 'my-named-secret',
      });

      const retrievedValue = await secretManager.getByName('my-named-secret');

      expect(retrievedValue).toBe(originalValue);
    });

    it('should return null for non-existent name', async () => {
      const value = await secretManager.getByName('non-existent-name');
      expect(value).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update secret value', async () => {
      const id = await secretManager.store('original-value', {
        name: 'update-test',
      });

      const success = await secretManager.update(id, 'new-value');
      const retrievedValue = await secretManager.get(id);

      expect(success).toBe(true);
      expect(retrievedValue).toBe('new-value');
    });

    it('should update metadata', async () => {
      const id = await secretManager.store('value', {
        name: 'metadata-update-test',
        metadata: { version: 1 },
      });

      await secretManager.updateMetadata(id, { version: 2, newField: 'test' });
      const storedData = secretManager.getStoredData(id);

      expect(storedData!.metadata).toEqual({ version: 2, newField: 'test' });
    });

    it('should return false for non-existent ID', async () => {
      const success = await secretManager.update('non-existent-id', 'value');
      expect(success).toBe(false);
    });

    it('should update the updatedAt timestamp', async () => {
      const id = await secretManager.store('value', {
        name: 'timestamp-test',
      });

      const beforeUpdate = secretManager.getStoredData(id)!.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      await secretManager.update(id, 'new-value');
      const afterUpdate = secretManager.getStoredData(id)!.updatedAt;

      expect(new Date(afterUpdate).getTime()).toBeGreaterThan(new Date(beforeUpdate).getTime());
    });
  });

  describe('delete()', () => {
    it('should delete a secret', async () => {
      const id = await secretManager.store('value', {
        name: 'delete-test',
      });

      const deleteSuccess = await secretManager.delete(id);
      const retrievedValue = await secretManager.get(id);

      expect(deleteSuccess).toBe(true);
      expect(retrievedValue).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const success = await secretManager.delete('non-existent-id');
      expect(success).toBe(false);
    });
  });

  describe('deleteByName()', () => {
    it('should delete a secret by name', async () => {
      await secretManager.store('value', {
        name: 'delete-by-name-test',
      });

      const deleteSuccess = await secretManager.deleteByName('delete-by-name-test');
      const retrievedValue = await secretManager.getByName('delete-by-name-test');

      expect(deleteSuccess).toBe(true);
      expect(retrievedValue).toBeNull();
    });
  });

  describe('list()', () => {
    beforeEach(async () => {
      await secretManager.store('value1', { name: 'secret-a', secretType: 'api_key' });
      await secretManager.store('value2', { name: 'secret-b', secretType: 'password' });
      await secretManager.store('value3', { name: 'secret-c', secretType: 'api_key' });
    });

    it('should return list of secret names without values', async () => {
      const list = await secretManager.list();

      expect(list.length).toBe(3);
      expect(list.every((item) => item.name !== undefined)).toBe(true);
      expect(list.every((item) => (item as any).encryptedValue === undefined)).toBe(true);
      expect(list.every((item) => (item as any).value === undefined)).toBe(true);
    });

    it('should include metadata in list', async () => {
      const list = await secretManager.list();

      expect(list.every((item) => item.secretType !== undefined)).toBe(true);
      expect(list.every((item) => item.createdAt !== undefined)).toBe(true);
    });

    it('should filter by secret type', async () => {
      const apiKeys = await secretManager.list({ secretType: 'api_key' });

      expect(apiKeys.length).toBe(2);
      expect(apiKeys.every((item) => item.secretType === 'api_key')).toBe(true);
    });

    it('should return empty array when no secrets exist', async () => {
      // Delete all secrets
      await secretManager.deleteByName('secret-a');
      await secretManager.deleteByName('secret-b');
      await secretManager.deleteByName('secret-c');

      const list = await secretManager.list();
      expect(list).toEqual([]);
    });
  });

  describe('requestConfirmation()', () => {
    it('should return proper i18n keys for confirmation', () => {
      const request = secretManager.requestConfirmation('my-api-key', 'sk-abc123xyz789');

      expect(request.messageKey).toBe('ccb.secret.confirmation');
      expect(request.privacyNoticeKey).toBe('ccb.secret.privacyNotice');
    });

    it('should include masked value in params', () => {
      const request = secretManager.requestConfirmation(
        'my-api-key',
        'sk-abc123def456ghi789jkl012mno345pqr678'
      );

      expect(request.params.maskedValue).not.toContain('abc123def456');
      expect(request.params.maskedValue).toContain('****');
    });

    it('should include secret name in params', () => {
      const request = secretManager.requestConfirmation('my-special-key', 'value');

      expect(request.params.secretName).toBe('my-special-key');
    });

    it('should include expiration info in params', () => {
      const request = secretManager.requestConfirmation('key', 'value', 86400);

      expect(request.params.expiresIn).toBe('1 day');
    });

    it('should show 30 days as default expiration', () => {
      const request = secretManager.requestConfirmation('key', 'value');

      expect(request.params.expiresIn).toBe('30 days');
    });
  });

  describe('Encryption/Decryption', () => {
    it('should use AES-256-GCM encryption', async () => {
      const id = await secretManager.store('test-value', { name: 'encryption-test' });
      const storedData = secretManager.getStoredData(id);

      // AES-256-GCM requires 16-byte IV and produces auth tag
      expect(Buffer.from(storedData!.iv, 'hex').length).toBe(16);
      expect(storedData!.authTag.length).toBeGreaterThan(0);
    });

    it('should produce different ciphertext for same value with different IVs', async () => {
      const id1 = await secretManager.store('same-value', { name: 'test-1' });
      const id2 = await secretManager.store('same-value', { name: 'test-2' });

      const stored1 = secretManager.getStoredData(id1);
      const stored2 = secretManager.getStoredData(id2);

      // Same plaintext but different IVs = different ciphertext
      expect(stored1!.encryptedValue).not.toBe(stored2!.encryptedValue);
    });

    it('should correctly decrypt special characters', async () => {
      const specialValue = 'p@$$w0rd!#$%^&*()_+-=[]{}|;:\'",.<>?/`~';
      const id = await secretManager.store(specialValue, { name: 'special-chars' });

      const retrieved = await secretManager.get(id);
      expect(retrieved).toBe(specialValue);
    });

    it('should correctly decrypt unicode characters', async () => {
      const unicodeValue = 'password-with-unicode-chars';
      const id = await secretManager.store(unicodeValue, { name: 'unicode-test' });

      const retrieved = await secretManager.get(id);
      expect(retrieved).toBe(unicodeValue);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty secret value', async () => {
      const id = await secretManager.store('', { name: 'empty-secret' });
      const retrieved = await secretManager.get(id);

      expect(retrieved).toBe('');
    });

    it('should handle very long secret values', async () => {
      const longValue = 'a'.repeat(10000);
      const id = await secretManager.store(longValue, { name: 'long-secret' });

      const retrieved = await secretManager.get(id);
      expect(retrieved).toBe(longValue);
    });

    it('should handle secret names with special characters', async () => {
      const id = await secretManager.store('value', {
        name: 'my-secret_key.v1',
      });

      expect(id).toBeDefined();
      const value = await secretManager.getByName('my-secret_key.v1');
      expect(value).toBe('value');
    });
  });

  describe('Expiry Cleanup', () => {
    it('should count expired secrets', async () => {
      // Store a secret with very short expiry (1 second)
      await secretManager.store('expiring-value', {
        name: 'expiring-secret',
        expiresInSeconds: 1,
      });

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Count should show 1 expired
      const count = await secretManager.countExpired();
      expect(count).toBe(1);
    });

    it('should cleanup expired secrets', async () => {
      // Store secrets with different expiry times
      await secretManager.store('short-lived', {
        name: 'short-secret',
        expiresInSeconds: 1,
      });

      await secretManager.store('long-lived', {
        name: 'long-secret',
        expiresInSeconds: 3600, // 1 hour
      });

      // Wait for short secret to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Cleanup should remove 1 secret
      const cleaned = await secretManager.cleanupExpired();
      expect(cleaned).toBe(1);

      // Long-lived secret should still exist
      const longValue = await secretManager.getByName('long-secret');
      expect(longValue).toBe('long-lived');

      // Short-lived secret should be gone
      const shortValue = await secretManager.getByName('short-secret');
      expect(shortValue).toBeNull();
    });

    it('should return 0 when no expired secrets', async () => {
      // Store a non-expiring secret
      await secretManager.store('permanent', {
        name: 'permanent-secret',
        expiresInSeconds: 3600,
      });

      const cleaned = await secretManager.cleanupExpired();
      expect(cleaned).toBe(0);
    });
  });
});
