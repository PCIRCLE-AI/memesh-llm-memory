/**
 * Access Control System
 *
 * Role-Based Access Control (RBAC) for credential vault:
 * - Define roles with permission sets
 * - Assign roles to users/processes
 * - Per-credential and per-service access control
 * - Audit all permission checks
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

/**
 * Permission types
 */
export enum Permission {
  READ = 'read',           // Can retrieve credentials
  WRITE = 'write',         // Can add/update credentials
  DELETE = 'delete',       // Can delete credentials
  ADMIN = 'admin',         // Can manage policies, unlock accounts, etc.
  ROTATE = 'rotate',       // Can mark credentials as rotated
  AUDIT = 'audit',         // Can view audit logs
}

/**
 * Built-in roles
 */
export enum Role {
  ADMIN = 'admin',         // All permissions
  USER = 'user',           // READ, WRITE, ROTATE
  READ_ONLY = 'read-only', // READ only
  AUDITOR = 'auditor',     // READ, AUDIT
}

/**
 * Role configuration
 */
export interface RoleConfig {
  id?: number;
  name: string;
  description?: string;
  permissions: Permission[];
  isBuiltIn: boolean;
  createdAt?: Date;
}

/**
 * User/Process identity
 */
export interface Identity {
  id: string;              // User ID or process ID
  type: 'user' | 'process' | 'service';
  metadata?: Record<string, any>;
}

/**
 * Access control entry
 */
export interface AccessControlEntry {
  id?: number;
  identityId: string;
  identityType: string;
  servicePattern?: string; // Optional service pattern (e.g., "production-*")
  service?: string;        // Specific service
  account?: string;        // Specific account
  permissions: Permission[];
  grantedAt?: Date;
  grantedBy?: string;
  expiresAt?: Date;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  matchedRule?: AccessControlEntry;
  effectivePermissions: Permission[];
}

/**
 * Access Control Manager
 */
export class AccessControl {
  private db: Database.Database;
  private currentIdentity?: Identity;
  private accessControlEnabled: boolean;

  constructor(db: Database.Database, identity?: Identity) {
    this.db = db;
    this.currentIdentity = identity;
    // Access control is only enabled when an identity is explicitly provided
    this.accessControlEnabled = identity !== undefined;
    this.initializeSchema();
    this.initializeBuiltInRoles();
  }

  /**
   * Initialize access control schema
   */
  private initializeSchema(): void {
    this.db.exec(`
      -- Roles table
      CREATE TABLE IF NOT EXISTS ac_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        permissions TEXT NOT NULL,
        is_built_in INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      -- Role assignments table
      CREATE TABLE IF NOT EXISTS ac_role_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identity_id TEXT NOT NULL,
        identity_type TEXT NOT NULL,
        role_id INTEGER NOT NULL,
        granted_at INTEGER NOT NULL,
        granted_by TEXT,
        expires_at INTEGER,
        FOREIGN KEY (role_id) REFERENCES ac_roles(id) ON DELETE CASCADE
      );

      -- Access control entries (per-credential or per-service ACLs)
      CREATE TABLE IF NOT EXISTS ac_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        identity_id TEXT NOT NULL,
        identity_type TEXT NOT NULL,
        service_pattern TEXT,
        service TEXT,
        account TEXT,
        permissions TEXT NOT NULL,
        granted_at INTEGER NOT NULL,
        granted_by TEXT,
        expires_at INTEGER,
        CHECK (service_pattern IS NOT NULL OR service IS NOT NULL)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_ac_role_assignments_identity
        ON ac_role_assignments(identity_id, identity_type);
      CREATE INDEX IF NOT EXISTS idx_ac_role_assignments_role
        ON ac_role_assignments(role_id);
      CREATE INDEX IF NOT EXISTS idx_ac_entries_identity
        ON ac_entries(identity_id, identity_type);
      CREATE INDEX IF NOT EXISTS idx_ac_entries_service
        ON ac_entries(service);
      CREATE INDEX IF NOT EXISTS idx_ac_entries_pattern
        ON ac_entries(service_pattern);
    `);
  }

  /**
   * Initialize built-in roles
   */
  private initializeBuiltInRoles(): void {
    const builtInRoles = [
      {
        name: Role.ADMIN,
        description: 'Administrator with all permissions',
        permissions: [
          Permission.READ,
          Permission.WRITE,
          Permission.DELETE,
          Permission.ADMIN,
          Permission.ROTATE,
          Permission.AUDIT,
        ],
      },
      {
        name: Role.USER,
        description: 'Standard user with read/write/rotate permissions',
        permissions: [Permission.READ, Permission.WRITE, Permission.ROTATE],
      },
      {
        name: Role.READ_ONLY,
        description: 'Read-only access',
        permissions: [Permission.READ],
      },
      {
        name: Role.AUDITOR,
        description: 'Read and audit access',
        permissions: [Permission.READ, Permission.AUDIT],
      },
    ];

    for (const role of builtInRoles) {
      // Check if role already exists
      const existing = this.db
        .prepare('SELECT id FROM ac_roles WHERE name = ?')
        .get(role.name);

      if (!existing) {
        this.db
          .prepare(
            `
          INSERT INTO ac_roles (name, description, permissions, is_built_in, created_at)
          VALUES (?, ?, ?, 1, ?)
        `
          )
          .run(
            role.name,
            role.description,
            JSON.stringify(role.permissions),
            Date.now()
          );

        logger.info(`Built-in role created: ${role.name}`);
      }
    }
  }

  /**
   * Set current identity for permission checks
   */
  setIdentity(identity: Identity): void {
    this.validateIdentity(identity, 'setIdentity');
    this.currentIdentity = identity;
  }

  /**
   * Get current identity
   */
  getIdentity(): Identity | undefined {
    return this.currentIdentity;
  }

  /**
   * Require ADMIN permission for sensitive operations
   *
   * Security policy:
   * - If NO identity is set: Allow operation (system/legacy mode for tests and setup)
   * - If identity IS set: Require ADMIN permission
   *
   * This maintains backward compatibility while enforcing security when identity is provided.
   *
   * @throws Error if current identity is set but doesn't have ADMIN permission
   */
  private requireAdmin(): void {
    // If no identity is set, allow operation (system/legacy mode)
    if (!this.currentIdentity) {
      return;
    }

    // If identity is set, enforce admin permission
    if (!this.isAdmin(this.currentIdentity)) {
      throw new Error('Admin permission required for this operation');
    }
  }

  /**
   * Validate and sanitize service pattern for GLOB matching
   * Prevents SQL injection and overly broad patterns
   *
   * @param pattern Service pattern to validate
   * @throws Error if pattern is invalid or dangerous
   */
  private validateServicePattern(pattern: string): void {
    if (!pattern || pattern.trim() === '') {
      throw new Error('Service pattern cannot be empty');
    }

    const trimmed = pattern.trim();

    // Prevent overly broad patterns that match everything
    if (trimmed === '*' || trimmed === '**' || trimmed === '*.*') {
      throw new Error(
        'Overly broad service pattern not allowed. Pattern would match all services.'
      );
    }

    // Check for dangerous characters that could be SQL injection attempts
    // Allow: alphanumeric, dot, hyphen, underscore, asterisk (for wildcards)
    const safePattern = /^[a-zA-Z0-9._\-*]+$/;
    if (!safePattern.test(trimmed)) {
      throw new Error(
        'Invalid characters in service pattern. Only alphanumeric, dot, hyphen, underscore, and asterisk are allowed.'
      );
    }

    // Ensure pattern has at least some specific prefix (not just wildcards)
    if (trimmed.startsWith('*')) {
      throw new Error(
        'Service pattern must start with a specific prefix, not a wildcard. Use "prefix.*" instead of "*".'
      );
    }

    // Warn about multiple consecutive wildcards
    if (trimmed.includes('**')) {
      throw new Error('Multiple consecutive wildcards are not allowed');
    }
  }

  /**
   * Validate identity object
   * Prevents malformed or malicious identities
   *
   * @param identity Identity to validate
   * @param context Optional context for error messages
   * @throws Error if identity is invalid
   */
  private validateIdentity(identity: Identity, context?: string): void {
    const ctx = context ? ` (${context})` : '';

    if (!identity) {
      throw new Error(`Identity is required${ctx}`);
    }

    if (!identity.id || typeof identity.id !== 'string' || identity.id.trim() === '') {
      throw new Error(`Identity id is required and must be a non-empty string${ctx}`);
    }

    if (!identity.type || typeof identity.type !== 'string' || identity.type.trim() === '') {
      throw new Error(`Identity type is required and must be a non-empty string${ctx}`);
    }

    // Validate id format - allow alphanumeric, hyphen, underscore, dot
    const safeIdPattern = /^[a-zA-Z0-9._\-@]+$/;
    if (!safeIdPattern.test(identity.id)) {
      throw new Error(
        `Invalid identity id format${ctx}. Only alphanumeric characters, dot, hyphen, underscore, and @ are allowed.`
      );
    }

    // Validate type - should be one of known types
    const validTypes = ['user', 'service', 'system', 'api', 'application'];
    if (!validTypes.includes(identity.type.toLowerCase())) {
      throw new Error(
        `Invalid identity type${ctx}. Must be one of: ${validTypes.join(', ')}`
      );
    }

    // Check for excessively long ids (potential DoS)
    if (identity.id.length > 255) {
      throw new Error(`Identity id is too long${ctx}. Maximum 255 characters allowed.`);
    }
  }

  /**
   * Create a custom role
   * @requires ADMIN permission
   */
  createRole(config: Omit<RoleConfig, 'id' | 'isBuiltIn' | 'createdAt'>): RoleConfig {
    this.requireAdmin();
    if (!config.name || config.name.trim().length === 0) {
      throw new Error('Role name is required');
    }

    if (!config.permissions || config.permissions.length === 0) {
      throw new Error('Role must have at least one permission');
    }

    // Security: Prevent ADMIN permission in custom roles
    // Only built-in admin role should have ADMIN permission
    if (config.permissions.includes(Permission.ADMIN)) {
      throw new Error(
        'ADMIN permission is restricted to built-in roles only. Custom roles cannot have ADMIN permission.'
      );
    }

    const now = Date.now();
    const result = this.db
      .prepare(
        `
      INSERT INTO ac_roles (name, description, permissions, is_built_in, created_at)
      VALUES (?, ?, ?, 0, ?)
    `
      )
      .run(
        config.name,
        config.description || null,
        JSON.stringify(config.permissions),
        now
      );

    logger.info(`Custom role created: ${config.name}`, {
      permissions: config.permissions,
    });

    return {
      id: result.lastInsertRowid as number,
      name: config.name,
      description: config.description,
      permissions: config.permissions,
      isBuiltIn: false,
      createdAt: new Date(now),
    };
  }

  /**
   * Get a role by name
   */
  getRole(name: string): RoleConfig | null {
    const row = this.db
      .prepare('SELECT * FROM ac_roles WHERE name = ?')
      .get(name) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: JSON.parse(row.permissions),
      isBuiltIn: row.is_built_in === 1,
      createdAt: new Date(row.created_at),
    };
  }

  /**
   * List all roles
   */
  listRoles(): RoleConfig[] {
    const rows = this.db
      .prepare('SELECT * FROM ac_roles ORDER BY is_built_in DESC, name')
      .all() as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: JSON.parse(row.permissions),
      isBuiltIn: row.is_built_in === 1,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Delete a custom role
   * @requires ADMIN permission
   */
  deleteRole(name: string): void {
    this.requireAdmin();
    const role = this.getRole(name);
    if (!role) {
      throw new Error(`Role not found: ${name}`);
    }

    if (role.isBuiltIn) {
      throw new Error(`Cannot delete built-in role: ${name}`);
    }

    this.db.prepare('DELETE FROM ac_roles WHERE name = ?').run(name);

    logger.info(`Custom role deleted: ${name}`);
  }

  /**
   * Assign a role to an identity
   * @requires ADMIN permission (except during initial bootstrap)
   *
   * Special case: Allows self-assignment during initial setup (when assigning to
   * currentIdentity and it has no roles yet)
   */
  assignRole(
    identity: Identity,
    roleName: string,
    options?: {
      grantedBy?: string;
      expiresAt?: Date;
    }
  ): void {
    // Validate identity
    this.validateIdentity(identity, 'assignRole');

    // Check if this is self-assignment during initial setup
    const isSelfAssignment =
      this.currentIdentity &&
      this.currentIdentity.id === identity.id &&
      this.currentIdentity.type === identity.type;

    if (isSelfAssignment) {
      // Check if identity has any roles assigned yet
      const existingRoles = this.db
        .prepare(
          `SELECT COUNT(*) as count FROM ac_role_assignments
           WHERE identity_id = ? AND identity_type = ?`
        )
        .get(identity.id, identity.type) as { count: number };

      // Allow self-assignment during initial setup (no roles yet)
      if (existingRoles.count === 0) {
        // Skip admin check for initial self-assignment
      } else {
        // Has roles, require admin permission for additional role assignment
        this.requireAdmin();
      }
    } else {
      // Not self-assignment, require admin permission
      this.requireAdmin();
    }

    const role = this.getRole(roleName);
    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    const now = Date.now();
    this.db
      .prepare(
        `
      INSERT INTO ac_role_assignments (
        identity_id, identity_type, role_id, granted_at, granted_by, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        identity.id,
        identity.type,
        role.id,
        now,
        options?.grantedBy || null,
        options?.expiresAt ? options.expiresAt.getTime() : null
      );

    logger.info(`Role assigned: ${roleName} to ${identity.type}:${identity.id}`);
  }

  /**
   * Revoke a role from an identity
   * @requires ADMIN permission
   */
  revokeRole(identity: Identity, roleName: string): void {
    this.validateIdentity(identity, 'revokeRole');
    this.requireAdmin();
    const role = this.getRole(roleName);
    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    const result = this.db
      .prepare(
        `
      DELETE FROM ac_role_assignments
      WHERE identity_id = ? AND identity_type = ? AND role_id = ?
    `
      )
      .run(identity.id, identity.type, role.id);

    if (result.changes === 0) {
      throw new Error(
        `Role assignment not found: ${roleName} for ${identity.type}:${identity.id}`
      );
    }

    logger.info(`Role revoked: ${roleName} from ${identity.type}:${identity.id}`);
  }

  /**
   * Get roles assigned to an identity
   */
  getRoles(identity: Identity): RoleConfig[] {
    this.validateIdentity(identity, 'getRoles');
    const now = Date.now();
    const rows = this.db
      .prepare(
        `
      SELECT r.*
      FROM ac_roles r
      JOIN ac_role_assignments ra ON ra.role_id = r.id
      WHERE ra.identity_id = ? AND ra.identity_type = ?
        AND (ra.expires_at IS NULL OR ra.expires_at > ?)
    `
      )
      .all(identity.id, identity.type, now) as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      permissions: JSON.parse(row.permissions),
      isBuiltIn: row.is_built_in === 1,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Grant specific permissions to an identity (ACL entry)
   * @requires ADMIN permission
   */
  grantPermissions(entry: Omit<AccessControlEntry, 'id' | 'grantedAt'>): void {
    this.requireAdmin();
    if (!entry.permissions || entry.permissions.length === 0) {
      throw new Error('Must specify at least one permission');
    }

    if (!entry.servicePattern && !entry.service) {
      throw new Error('Must specify either servicePattern or service');
    }

    // Validate service pattern for security
    if (entry.servicePattern) {
      this.validateServicePattern(entry.servicePattern);
    }

    // Security: Prevent ADMIN permission in ACL entries
    // ADMIN permission should only be granted through roles
    if (entry.permissions.includes(Permission.ADMIN)) {
      throw new Error(
        'ADMIN permission cannot be granted via ACL entries. Use role assignments instead.'
      );
    }

    const now = Date.now();
    this.db
      .prepare(
        `
      INSERT INTO ac_entries (
        identity_id, identity_type, service_pattern, service, account,
        permissions, granted_at, granted_by, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        entry.identityId,
        entry.identityType,
        entry.servicePattern || null,
        entry.service || null,
        entry.account || null,
        JSON.stringify(entry.permissions),
        now,
        entry.grantedBy || null,
        entry.expiresAt ? entry.expiresAt.getTime() : null
      );

    logger.info(`Permissions granted to ${entry.identityType}:${entry.identityId}`, {
      service: entry.service || entry.servicePattern,
      account: entry.account,
      permissions: entry.permissions,
    });
  }

  /**
   * Revoke permissions from an identity
   * @requires ADMIN permission
   */
  revokePermissions(
    identity: Identity,
    service?: string,
    account?: string
  ): void {
    this.validateIdentity(identity, 'revokePermissions');
    this.requireAdmin();
    let query = `
      DELETE FROM ac_entries
      WHERE identity_id = ? AND identity_type = ?
    `;
    const params: unknown[] = [identity.id, identity.type];

    if (service) {
      query += ' AND service = ?';
      params.push(service);
    }

    if (account) {
      query += ' AND account = ?';
      params.push(account);
    }

    const result = this.db.prepare(query).run(...params);

    logger.info(
      `Revoked ${result.changes} permission entries for ${identity.type}:${identity.id}`
    );
  }

  /**
   * Check if identity has permission for operation
   */
  checkPermission(
    permission: Permission,
    service: string,
    account?: string,
    identity?: Identity
  ): PermissionCheckResult {
    // If access control is not enabled, grant full access
    if (!this.accessControlEnabled) {
      return {
        allowed: true,
        reason: 'Access control disabled (no identity required)',
        effectivePermissions: Object.values(Permission),
      };
    }

    const checkIdentity = identity || this.currentIdentity;

    if (!checkIdentity) {
      return {
        allowed: false,
        reason: 'No identity specified (access control enabled)',
        effectivePermissions: [],
      };
    }

    // Validate the identity being checked
    try {
      this.validateIdentity(checkIdentity, 'checkPermission');
    } catch (error) {
      return {
        allowed: false,
        reason: `Invalid identity: ${(error as Error).message}`,
        effectivePermissions: [],
      };
    }

    // Collect all effective permissions
    const effectivePermissions: Set<Permission> = new Set();
    let matchedRule: AccessControlEntry | undefined;

    // 1. Check role-based permissions
    const roles = this.getRoles(checkIdentity);
    for (const role of roles) {
      for (const perm of role.permissions) {
        effectivePermissions.add(perm as Permission);
      }
    }

    // 2. Check ACL entries (specific grants)
    const now = Date.now();
    const aclEntries = this.db
      .prepare(
        `
      SELECT * FROM ac_entries
      WHERE identity_id = ? AND identity_type = ?
        AND (expires_at IS NULL OR expires_at > ?)
        AND (
          (service = ? AND (account IS NULL OR account = ?))
          OR (service_pattern IS NOT NULL AND ? GLOB service_pattern)
        )
    `
      )
      .all(
        checkIdentity.id,
        checkIdentity.type,
        now,
        service,
        account || '',
        service
      ) as any[];

    // Add ACL permissions
    for (const entry of aclEntries) {
      const entryPerms = JSON.parse(entry.permissions) as Permission[];
      for (const perm of entryPerms) {
        effectivePermissions.add(perm);
      }

      // Store most specific matched rule
      if (!matchedRule || (entry.account && !matchedRule.account)) {
        matchedRule = {
          id: entry.id,
          identityId: entry.identity_id,
          identityType: entry.identity_type,
          servicePattern: entry.service_pattern,
          service: entry.service,
          account: entry.account,
          permissions: entryPerms,
          grantedAt: new Date(entry.granted_at),
          grantedBy: entry.granted_by,
          expiresAt: entry.expires_at ? new Date(entry.expires_at) : undefined,
        };
      }
    }

    // Check if ADMIN permission grants all permissions
    if (effectivePermissions.has(Permission.ADMIN)) {
      effectivePermissions.add(Permission.READ);
      effectivePermissions.add(Permission.WRITE);
      effectivePermissions.add(Permission.DELETE);
      effectivePermissions.add(Permission.ROTATE);
      effectivePermissions.add(Permission.AUDIT);
    }

    const allowed = effectivePermissions.has(permission);

    return {
      allowed,
      reason: allowed
        ? undefined
        : `Permission denied: ${permission} on ${service}${account ? `/${account}` : ''}`,
      matchedRule,
      effectivePermissions: Array.from(effectivePermissions),
    };
  }

  /**
   * List all ACL entries for an identity
   */
  listAccessEntries(identity: Identity): AccessControlEntry[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM ac_entries
      WHERE identity_id = ? AND identity_type = ?
      ORDER BY granted_at DESC
    `
      )
      .all(identity.id, identity.type) as any[];

    return rows.map((row) => ({
      id: row.id,
      identityId: row.identity_id,
      identityType: row.identity_type,
      servicePattern: row.service_pattern,
      service: row.service,
      account: row.account,
      permissions: JSON.parse(row.permissions),
      grantedAt: new Date(row.granted_at),
      grantedBy: row.granted_by,
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    }));
  }

  /**
   * Check if identity is admin
   */
  isAdmin(identity?: Identity): boolean {
    const checkIdentity = identity || this.currentIdentity;
    if (!checkIdentity) return false;

    const result = this.checkPermission(
      Permission.ADMIN,
      '*',
      undefined,
      checkIdentity
    );
    return result.allowed;
  }
}
