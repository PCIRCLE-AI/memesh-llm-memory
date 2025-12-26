/**
 * Security Tests for Credential Vault
 *
 * Tests for:
 * - Command injection prevention (MacOSKeychain)
 * - Input validation (service/account names)
 * - Path traversal prevention
 * - SQL injection prevention
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CredentialVault } from './CredentialVault.js';
import { MacOSKeychain } from './storage/MacOSKeychain.js';
import { Role, type Identity } from './AccessControl.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, existsSync } from 'fs';

describe('Security Tests: Input Validation', () => {
  let vault: CredentialVault;
  let testDbPath: string;

  const testIdentity: Identity = {
    id: 'test-user',
    type: 'user',
  };

  beforeEach(async () => {
    // Create temporary database for testing
    testDbPath = join(tmpdir(), `test-vault-${Date.now()}.db`);
    vault = new CredentialVault(testDbPath);
    await vault.initialize();

    // Set up test identity with admin role for testing
    vault.assignRole(testIdentity, Role.ADMIN);
    vault.setIdentity(testIdentity);
  });

  afterEach(() => {
    vault.close();
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
  });

  describe('Service Name Validation', () => {
    it('should reject empty service name', async () => {
      await expect(
        vault.add({
          service: '',
          account: 'test',
          value: 'password',
        })
      ).rejects.toThrow('Service name cannot be empty');
    });

    it('should reject service name longer than 255 characters', async () => {
      const longName = 'a'.repeat(256);
      await expect(
        vault.add({
          service: longName,
          account: 'test',
          value: 'password',
        })
      ).rejects.toThrow('Service name too long');
    });

    it('should reject service name with invalid characters', async () => {
      const invalidNames = [
        'service name', // space
        'service/name', // forward slash
        'service\\name', // backslash
        'service$name', // dollar sign
        'service;name', // semicolon
        'service|name', // pipe
        'service&name', // ampersand
        'service`name', // backtick
        'service(name)', // parentheses
      ];

      for (const name of invalidNames) {
        await expect(
          vault.add({
            service: name,
            account: 'test',
            value: 'password',
          })
        ).rejects.toThrow('Service name contains invalid characters');
      }
    });

    it('should reject service name containing ".."', async () => {
      await expect(
        vault.add({
          service: 'parent..child',
          account: 'test',
          value: 'password',
        })
      ).rejects.toThrow('Service name cannot contain ".."');
    });

    it('should reject service name starting with "."', async () => {
      await expect(
        vault.add({
          service: '.hidden',
          account: 'test',
          value: 'password',
        })
      ).rejects.toThrow('Service name cannot start or end with "."');
    });

    it('should reject service name ending with "."', async () => {
      await expect(
        vault.add({
          service: 'service.',
          account: 'test',
          value: 'password',
        })
      ).rejects.toThrow('Service name cannot start or end with "."');
    });

    it('should accept valid service names', async () => {
      const validNames = [
        'service',
        'my-service',
        'my_service',
        'my.service',
        'Service123',
        'service-v1.2.3',
      ];

      for (const name of validNames) {
        await expect(
          vault.add({
            service: name,
            account: `test-${name}`,
            value: 'password',
          })
        ).resolves.toBeDefined();
      }
    });
  });

  describe('Account Name Validation', () => {
    it('should reject empty account name', async () => {
      await expect(
        vault.add({
          service: 'test-service',
          account: '',
          value: 'password',
        })
      ).rejects.toThrow('Account name cannot be empty');
    });

    it('should reject account name longer than 255 characters', async () => {
      const longName = 'a'.repeat(256);
      await expect(
        vault.add({
          service: 'test-service',
          account: longName,
          value: 'password',
        })
      ).rejects.toThrow('Account name too long');
    });

    it('should reject account name containing null bytes', async () => {
      await expect(
        vault.add({
          service: 'test-service',
          account: 'user\0admin',
          value: 'password',
        })
      ).rejects.toThrow('Account name cannot contain null bytes');
    });

    it('should reject account name containing colon', async () => {
      await expect(
        vault.add({
          service: 'test-service',
          account: 'user:admin',
          value: 'password',
        })
      ).rejects.toThrow('Account name cannot contain ":"');
    });

    it('should reject account name with path traversal characters', async () => {
      const pathTraversalNames = [
        '../etc/passwd',
        'user/../admin',
        'user/admin',
        'user\\admin',
      ];

      for (const name of pathTraversalNames) {
        await expect(
          vault.add({
            service: 'test-service',
            account: name,
            value: 'password',
          })
        ).rejects.toThrow('Account name cannot contain path traversal characters');
      }
    });

    it('should accept valid account names', async () => {
      const validNames = [
        'user',
        'user@example.com',
        'user-123',
        'user_name',
        'CamelCaseUser',
      ];

      let serviceIndex = 0;
      for (const name of validNames) {
        await expect(
          vault.add({
            service: `test-service-${serviceIndex++}`,
            account: name,
            value: 'password',
          })
        ).resolves.toBeDefined();
      }
    });
  });

  describe('Validation in all CRUD operations', () => {
    it('should validate service/account in get()', async () => {
      await expect(
        vault.get('invalid/service', 'account')
      ).rejects.toThrow('Service name contains invalid characters');

      await expect(
        vault.get('service', 'invalid:account')
      ).rejects.toThrow('Account name cannot contain ":"');
    });

    it('should validate service/account in delete()', async () => {
      await expect(
        vault.delete('invalid/service', 'account')
      ).rejects.toThrow('Service name contains invalid characters');

      await expect(
        vault.delete('service', 'invalid:account')
      ).rejects.toThrow('Account name cannot contain ":"');
    });

    it('should validate service/account in update()', async () => {
      await expect(
        vault.update('invalid/service', 'account', { value: 'new' })
      ).rejects.toThrow('Service name contains invalid characters');

      await expect(
        vault.update('service', 'invalid:account', { value: 'new' })
      ).rejects.toThrow('Account name cannot contain ":"');
    });
  });
});

describe('Security Tests: Command Injection Prevention', () => {
  // These tests verify that malicious input cannot execute shell commands
  // when passed to the macOS Keychain security command

  describe('MacOSKeychain command injection tests', () => {
    // Mock spawn to capture command execution
    let vault: CredentialVault;
    let testDbPath: string;
    const testIdentity: Identity = { id: 'test-admin', type: 'user' };

    beforeEach(async () => {
      testDbPath = join(tmpdir(), `test-vault-${Date.now()}.db`);
      vault = new CredentialVault(testDbPath);
      await vault.initialize();

      // Set up test identity with admin role for testing
      vault.assignRole(testIdentity, Role.ADMIN);
      vault.setIdentity(testIdentity);
    });

    afterEach(() => {
      vault.close();
      if (existsSync(testDbPath)) {
        rmSync(testDbPath);
      }
    });

    it('should not execute injected commands in service name', async () => {
      const maliciousNames = [
        'service; echo HACKED',
        'service && rm -rf /',
        'service | cat /etc/passwd',
        'service $(whoami)',
        'service `id`',
      ];

      // These should all be rejected by validation BEFORE reaching the keychain
      for (const name of maliciousNames) {
        await expect(
          vault.add({
            service: name,
            account: 'test',
            value: 'password',
          })
        ).rejects.toThrow(); // Will throw validation error
      }
    });

    it('should not execute injected commands in account name', async () => {
      // Note: Account name validation only blocks `:`, null bytes, and path traversal (/, \, ..)
      // Other shell metacharacters like `;`, `|`, `$()` are ALLOWED in account names
      // but should NOT cause command injection due to spawn() usage

      const maliciousNames = [
        'user; echo HACKED',
        'user | echo PWNED', // No path separators
        'user $(whoami)',
        'user `id`',
      ];

      let serviceIndex = 0;
      for (const name of maliciousNames) {
        // These should be SAFELY STORED without executing the injected commands
        // The protection comes from spawn() not exec()
        await expect(
          vault.add({
            service: `test-service-${serviceIndex++}`,
            account: name,
            value: 'password',
          })
        ).resolves.toBeDefined(); // Successfully stores without executing injection

        // Verify it was stored correctly
        const cred = await vault.get(`test-service-${serviceIndex - 1}`, name);
        expect(cred).toBeDefined();
        expect(cred?.account).toBe(name); // Stored as literal string
      }
    });

    it('should safely handle special characters in credential value', async () => {
      // Values should be safely handled even with special characters
      const specialValues = [
        'password;with;semicolons',
        'password|with|pipes',
        'password&with&ampersands',
        'password$(with)$(subshells)',
        'password`with`backticks',
      ];

      // Add a valid credential first
      await vault.add({
        service: 'test-service',
        account: 'test-user',
        value: 'initial',
      });

      // Update with special character values
      for (const value of specialValues) {
        await expect(
          vault.update('test-service', 'test-user', { value })
        ).resolves.toBeDefined();

        // Verify the value was stored correctly
        const cred = await vault.get('test-service', 'test-user');
        expect(cred?.value).toBe(value);
      }
    });
  });
});

describe('Security Tests: SQL Injection Prevention', () => {
  let vault: CredentialVault;
  let testDbPath: string;
  const testIdentity: Identity = { id: 'test-admin', type: 'user' };

  beforeEach(async () => {
    testDbPath = join(tmpdir(), `test-vault-${Date.now()}.db`);
    vault = new CredentialVault(testDbPath);
    await vault.initialize();

    // Set up test identity with admin role for testing
    vault.assignRole(testIdentity, Role.ADMIN);
    vault.setIdentity(testIdentity);
  });

  afterEach(() => {
    vault.close();
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
  });

  it('should safely handle SQL special characters in metadata', async () => {
    // These characters are dangerous in SQL but should be safe with prepared statements
    // Note: Service/account validation will reject most of these, so we test in notes/tags

    await vault.add({
      service: 'test-service',
      account: 'test-user',
      value: 'password',
      notes: "User's password with 'single quotes' and \"double quotes\"",
      tags: ["tag-with-'quote", 'tag-with-"-quote', 'tag-with-;-semicolon'],
    });

    const cred = await vault.get('test-service', 'test-user');
    expect(cred).toBeDefined();
    expect(cred?.metadata?.notes).toBe("User's password with 'single quotes' and \"double quotes\"");
    expect(cred?.metadata?.tags).toEqual(["tag-with-'quote", 'tag-with-"-quote', 'tag-with-;-semicolon']);
  });

  it('should not allow SQL injection in tag queries', async () => {
    // Add some test credentials
    await vault.add({
      service: 'service1',
      account: 'user1',
      value: 'pass1',
      tags: ['production'],
    });

    await vault.add({
      service: 'service2',
      account: 'user2',
      value: 'pass2',
      tags: ['staging'],
    });

    // Try SQL injection in tag search
    const maliciousTags = [
      "production' OR '1'='1",
      "production'; DROP TABLE credentials; --",
      "production' UNION SELECT * FROM credentials WHERE '1'='1",
    ];

    for (const tag of maliciousTags) {
      // Should return empty result (tag doesn't exist), not all credentials
      const results = await vault.findByTag(tag);
      expect(results.length).toBe(0);
    }

    // Verify original credentials still exist
    const allCreds = await vault.list();
    expect(allCreds.length).toBe(2);
  });
});

describe('Security Tests: Path Traversal Prevention', () => {
  let vault: CredentialVault;
  let testDbPath: string;
  const testIdentity: Identity = { id: 'test-admin', type: 'user' };

  beforeEach(async () => {
    testDbPath = join(tmpdir(), `test-vault-${Date.now()}.db`);
    vault = new CredentialVault(testDbPath);
    await vault.initialize();

    // Set up test identity with admin role for testing
    vault.assignRole(testIdentity, Role.ADMIN);
    vault.setIdentity(testIdentity);
  });

  afterEach(() => {
    vault.close();
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
  });

  it('should prevent path traversal in service name', async () => {
    const pathTraversalAttempts = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      'service/../../../etc/shadow',
      './hidden/../../etc/hosts',
    ];

    for (const attempt of pathTraversalAttempts) {
      await expect(
        vault.add({
          service: attempt,
          account: 'test',
          value: 'password',
        })
      ).rejects.toThrow(); // Validation should catch these
    }
  });

  it('should prevent path traversal in account name', async () => {
    const pathTraversalAttempts = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      'user/../../../etc/shadow',
      './user/../../etc/hosts',
    ];

    for (const attempt of pathTraversalAttempts) {
      await expect(
        vault.add({
          service: 'test-service',
          account: attempt,
          value: 'password',
        })
      ).rejects.toThrow(); // Validation should catch these
    }
  });

  it('should not create files outside vault directory', async () => {
    // Even if somehow validation was bypassed, the vault directory structure
    // should prevent writing outside the designated location

    // Verify vault path is within expected location
    const vaultPath = vault['db']['name']; // Access private field for testing
    expect(vaultPath).toContain(tmpdir());
  });
});

describe('Security Tests: Resource Cleanup', () => {
  it('should properly clean up database connections on process exit', () => {
    const testDbPath = join(tmpdir(), `test-vault-cleanup-${Date.now()}.db`);
    const vault = new CredentialVault(testDbPath);

    // Verify instance was registered
    expect(CredentialVault['instances'].has(vault)).toBe(true);

    // Close vault
    vault.close();

    // Verify instance was removed
    expect(CredentialVault['instances'].has(vault)).toBe(false);

    // Clean up
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
  });

  it('should handle multiple vault instances', () => {
    const vaults = [
      new CredentialVault(join(tmpdir(), `vault1-${Date.now()}.db`)),
      new CredentialVault(join(tmpdir(), `vault2-${Date.now()}.db`)),
      new CredentialVault(join(tmpdir(), `vault3-${Date.now()}.db`)),
    ];

    // Verify all registered
    expect(CredentialVault['instances'].size).toBeGreaterThanOrEqual(3);

    // Close all
    vaults.forEach(v => v.close());

    // Clean up files
    vaults.forEach(v => {
      const path = v['db']['name'];
      if (existsSync(path)) {
        rmSync(path);
      }
    });
  });
});
