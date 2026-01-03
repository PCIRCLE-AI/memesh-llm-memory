import { logger } from '../utils/logger.js';
export var Permission;
(function (Permission) {
    Permission["READ"] = "read";
    Permission["WRITE"] = "write";
    Permission["DELETE"] = "delete";
    Permission["ADMIN"] = "admin";
    Permission["ROTATE"] = "rotate";
    Permission["AUDIT"] = "audit";
})(Permission || (Permission = {}));
export var Role;
(function (Role) {
    Role["ADMIN"] = "admin";
    Role["USER"] = "user";
    Role["READ_ONLY"] = "read-only";
    Role["AUDITOR"] = "auditor";
})(Role || (Role = {}));
export class AccessControl {
    db;
    currentIdentity;
    accessControlEnabled;
    constructor(db, identity) {
        this.db = db;
        this.currentIdentity = identity;
        this.accessControlEnabled = identity !== undefined;
        this.initializeSchema();
        this.initializeBuiltInRoles();
    }
    initializeSchema() {
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
    initializeBuiltInRoles() {
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
            const existing = this.db
                .prepare('SELECT id FROM ac_roles WHERE name = ?')
                .get(role.name);
            if (!existing) {
                this.db
                    .prepare(`
          INSERT INTO ac_roles (name, description, permissions, is_built_in, created_at)
          VALUES (?, ?, ?, 1, ?)
        `)
                    .run(role.name, role.description, JSON.stringify(role.permissions), Date.now());
                logger.info(`Built-in role created: ${role.name}`);
            }
        }
    }
    setIdentity(identity) {
        this.validateIdentity(identity, 'setIdentity');
        this.currentIdentity = identity;
    }
    getIdentity() {
        return this.currentIdentity;
    }
    requireAdmin() {
        if (!this.currentIdentity) {
            return;
        }
        if (!this.isAdmin(this.currentIdentity)) {
            throw new Error('Admin permission required for this operation');
        }
    }
    validateServicePattern(pattern) {
        if (!pattern || pattern.trim() === '') {
            throw new Error('Service pattern cannot be empty');
        }
        const trimmed = pattern.trim();
        if (trimmed === '*' || trimmed === '**' || trimmed === '*.*') {
            throw new Error('Overly broad service pattern not allowed. Pattern would match all services.');
        }
        const safePattern = /^[a-zA-Z0-9._\-*]+$/;
        if (!safePattern.test(trimmed)) {
            throw new Error('Invalid characters in service pattern. Only alphanumeric, dot, hyphen, underscore, and asterisk are allowed.');
        }
        if (trimmed.startsWith('*')) {
            throw new Error('Service pattern must start with a specific prefix, not a wildcard. Use "prefix.*" instead of "*".');
        }
        if (trimmed.includes('**')) {
            throw new Error('Multiple consecutive wildcards are not allowed');
        }
    }
    validateIdentity(identity, context) {
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
        const safeIdPattern = /^[a-zA-Z0-9._\-@]+$/;
        if (!safeIdPattern.test(identity.id)) {
            throw new Error(`Invalid identity id format${ctx}. Only alphanumeric characters, dot, hyphen, underscore, and @ are allowed.`);
        }
        const validTypes = ['user', 'service', 'system', 'api', 'application'];
        if (!validTypes.includes(identity.type.toLowerCase())) {
            throw new Error(`Invalid identity type${ctx}. Must be one of: ${validTypes.join(', ')}`);
        }
        if (identity.id.length > 255) {
            throw new Error(`Identity id is too long${ctx}. Maximum 255 characters allowed.`);
        }
    }
    createRole(config) {
        this.requireAdmin();
        if (!config.name || config.name.trim().length === 0) {
            throw new Error('Role name is required');
        }
        if (!config.permissions || config.permissions.length === 0) {
            throw new Error('Role must have at least one permission');
        }
        if (config.permissions.includes(Permission.ADMIN)) {
            throw new Error('ADMIN permission is restricted to built-in roles only. Custom roles cannot have ADMIN permission.');
        }
        const now = Date.now();
        const result = this.db
            .prepare(`
      INSERT INTO ac_roles (name, description, permissions, is_built_in, created_at)
      VALUES (?, ?, ?, 0, ?)
    `)
            .run(config.name, config.description || null, JSON.stringify(config.permissions), now);
        logger.info(`Custom role created: ${config.name}`, {
            permissions: config.permissions,
        });
        return {
            id: result.lastInsertRowid,
            name: config.name,
            description: config.description,
            permissions: config.permissions,
            isBuiltIn: false,
            createdAt: new Date(now),
        };
    }
    getRole(name) {
        const row = this.db
            .prepare('SELECT * FROM ac_roles WHERE name = ?')
            .get(name);
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            permissions: JSON.parse(row.permissions),
            isBuiltIn: row.is_built_in === 1,
            createdAt: new Date(row.created_at),
        };
    }
    listRoles() {
        const rows = this.db
            .prepare('SELECT * FROM ac_roles ORDER BY is_built_in DESC, name')
            .all();
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            permissions: JSON.parse(row.permissions),
            isBuiltIn: row.is_built_in === 1,
            createdAt: new Date(row.created_at),
        }));
    }
    deleteRole(name) {
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
    assignRole(identity, roleName, options) {
        this.validateIdentity(identity, 'assignRole');
        const isSelfAssignment = this.currentIdentity &&
            this.currentIdentity.id === identity.id &&
            this.currentIdentity.type === identity.type;
        if (isSelfAssignment) {
            const existingRoles = this.db
                .prepare(`SELECT COUNT(*) as count FROM ac_role_assignments
           WHERE identity_id = ? AND identity_type = ?`)
                .get(identity.id, identity.type);
            if (existingRoles.count === 0) {
            }
            else {
                this.requireAdmin();
            }
        }
        else {
            this.requireAdmin();
        }
        const role = this.getRole(roleName);
        if (!role) {
            throw new Error(`Role not found: ${roleName}`);
        }
        const now = Date.now();
        this.db
            .prepare(`
      INSERT INTO ac_role_assignments (
        identity_id, identity_type, role_id, granted_at, granted_by, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
            .run(identity.id, identity.type, role.id, now, options?.grantedBy || null, options?.expiresAt ? options.expiresAt.getTime() : null);
        logger.info(`Role assigned: ${roleName} to ${identity.type}:${identity.id}`);
    }
    revokeRole(identity, roleName) {
        this.validateIdentity(identity, 'revokeRole');
        this.requireAdmin();
        const role = this.getRole(roleName);
        if (!role) {
            throw new Error(`Role not found: ${roleName}`);
        }
        const result = this.db
            .prepare(`
      DELETE FROM ac_role_assignments
      WHERE identity_id = ? AND identity_type = ? AND role_id = ?
    `)
            .run(identity.id, identity.type, role.id);
        if (result.changes === 0) {
            throw new Error(`Role assignment not found: ${roleName} for ${identity.type}:${identity.id}`);
        }
        logger.info(`Role revoked: ${roleName} from ${identity.type}:${identity.id}`);
    }
    getRoles(identity) {
        this.validateIdentity(identity, 'getRoles');
        const now = Date.now();
        const rows = this.db
            .prepare(`
      SELECT r.*
      FROM ac_roles r
      JOIN ac_role_assignments ra ON ra.role_id = r.id
      WHERE ra.identity_id = ? AND ra.identity_type = ?
        AND (ra.expires_at IS NULL OR ra.expires_at > ?)
    `)
            .all(identity.id, identity.type, now);
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            permissions: JSON.parse(row.permissions),
            isBuiltIn: row.is_built_in === 1,
            createdAt: new Date(row.created_at),
        }));
    }
    grantPermissions(entry) {
        this.requireAdmin();
        if (!entry.permissions || entry.permissions.length === 0) {
            throw new Error('Must specify at least one permission');
        }
        if (!entry.servicePattern && !entry.service) {
            throw new Error('Must specify either servicePattern or service');
        }
        if (entry.servicePattern) {
            this.validateServicePattern(entry.servicePattern);
        }
        if (entry.permissions.includes(Permission.ADMIN)) {
            throw new Error('ADMIN permission cannot be granted via ACL entries. Use role assignments instead.');
        }
        const now = Date.now();
        this.db
            .prepare(`
      INSERT INTO ac_entries (
        identity_id, identity_type, service_pattern, service, account,
        permissions, granted_at, granted_by, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
            .run(entry.identityId, entry.identityType, entry.servicePattern || null, entry.service || null, entry.account || null, JSON.stringify(entry.permissions), now, entry.grantedBy || null, entry.expiresAt ? entry.expiresAt.getTime() : null);
        logger.info(`Permissions granted to ${entry.identityType}:${entry.identityId}`, {
            service: entry.service || entry.servicePattern,
            account: entry.account,
            permissions: entry.permissions,
        });
    }
    revokePermissions(identity, service, account) {
        this.validateIdentity(identity, 'revokePermissions');
        this.requireAdmin();
        let query = `
      DELETE FROM ac_entries
      WHERE identity_id = ? AND identity_type = ?
    `;
        const params = [identity.id, identity.type];
        if (service) {
            query += ' AND service = ?';
            params.push(service);
        }
        if (account) {
            query += ' AND account = ?';
            params.push(account);
        }
        const result = this.db.prepare(query).run(...params);
        logger.info(`Revoked ${result.changes} permission entries for ${identity.type}:${identity.id}`);
    }
    checkPermission(permission, service, account, identity) {
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
        try {
            this.validateIdentity(checkIdentity, 'checkPermission');
        }
        catch (error) {
            return {
                allowed: false,
                reason: `Invalid identity: ${error.message}`,
                effectivePermissions: [],
            };
        }
        const effectivePermissions = new Set();
        let matchedRule;
        const roles = this.getRoles(checkIdentity);
        for (const role of roles) {
            for (const perm of role.permissions) {
                effectivePermissions.add(perm);
            }
        }
        const now = Date.now();
        const aclEntries = this.db
            .prepare(`
      SELECT * FROM ac_entries
      WHERE identity_id = ? AND identity_type = ?
        AND (expires_at IS NULL OR expires_at > ?)
        AND (
          (service = ? AND (account IS NULL OR account = ?))
          OR (service_pattern IS NOT NULL AND ? GLOB service_pattern)
        )
    `)
            .all(checkIdentity.id, checkIdentity.type, now, service, account || '', service);
        for (const entry of aclEntries) {
            const entryPerms = JSON.parse(entry.permissions);
            for (const perm of entryPerms) {
                effectivePermissions.add(perm);
            }
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
    listAccessEntries(identity) {
        const rows = this.db
            .prepare(`
      SELECT * FROM ac_entries
      WHERE identity_id = ? AND identity_type = ?
      ORDER BY granted_at DESC
    `)
            .all(identity.id, identity.type);
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
    isAdmin(identity) {
        const checkIdentity = identity || this.currentIdentity;
        if (!checkIdentity)
            return false;
        const result = this.checkPermission(Permission.ADMIN, '*', undefined, checkIdentity);
        return result.allowed;
    }
}
//# sourceMappingURL=AccessControl.js.map