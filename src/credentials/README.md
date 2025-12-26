# Credential Management System

A comprehensive, secure credential management system with enterprise-grade security features including rate limiting, audit logging, rotation policies, and role-based access control (RBAC).

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Security Features](#security-features)
  - [Rate Limiting](#rate-limiting)
  - [Audit Logging](#audit-logging)
  - [Rotation Policies](#rotation-policies)
  - [Access Control (RBAC)](#access-control-rbac)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Testing](#testing)

## Features

### Core Capabilities
- ✅ Secure credential storage with platform-native backends (macOS Keychain, Windows Credential Manager, Linux Secret Service)
- ✅ Encrypted storage with AES-256-GCM
- ✅ SQLite metadata database with WAL mode for concurrent access
- ✅ Full TypeScript support with comprehensive type definitions

### Security Features
- ✅ **Rate Limiting**: Prevent brute-force attacks with configurable rate limits
- ✅ **Audit Logging**: Comprehensive audit trail for all operations
- ✅ **Rotation Policies**: Automated credential rotation with configurable intervals
- ✅ **Access Control (RBAC)**: Role-based permissions with fine-grained ACLs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CredentialVault                        │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Rate Limiter │  │Audit Logger  │  │ Access       │     │
│  │              │  │              │  │ Control      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ Rotation     │  │ Secure       │                       │
│  │ Policy       │  │ Storage      │                       │
│  └──────────────┘  └──────────────┘                       │
├─────────────────────────────────────────────────────────────┤
│                    SQLite Database                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐  │
│  │credentials│ │rate_limits│ │audit_logs │ │ac_roles  │  │
│  └───────────┘ └───────────┘ └───────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────┤
│              Platform-Native Secure Storage                 │
│     macOS Keychain / Windows Credential Manager /          │
│              Linux Secret Service / Encrypted File          │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install
```

Dependencies:
- `better-sqlite3` - SQLite database
- `keytar` - Platform-native secure storage (optional)

## Quick Start

### Basic Usage

```typescript
import { CredentialVault } from './credentials';

// Create vault (automatically initializes security features)
const vault = new CredentialVault();

// Add a credential
await vault.add({
  service: 'my-api',
  account: 'production',
  credential: { apiKey: 'secret-key-123' }
});

// Retrieve a credential
const cred = await vault.get('my-api', 'production');
console.log(cred.credential.apiKey); // 'secret-key-123'

// Delete a credential
await vault.delete('my-api', 'production');

// Close vault
await vault.close();
```

### With Access Control

```typescript
import { CredentialVault, Role } from './credentials';

// Create vault with user identity
const adminVault = new CredentialVault(undefined, {
  id: 'admin-user',
  type: 'user'
});

// Assign admin role
adminVault.assignRole({ id: 'admin-user', type: 'user' }, Role.ADMIN);

// Create vault for regular user
const userVault = new CredentialVault(undefined, {
  id: 'regular-user',
  type: 'user'
});

userVault.assignRole({ id: 'regular-user', type: 'user' }, Role.USER);

// Admin can delete
await adminVault.delete('my-api', 'production'); // ✅ Allowed

// Regular user cannot delete
await userVault.delete('my-api', 'production'); // ❌ Permission denied
```

## Security Features

### Rate Limiting

Prevents brute-force attacks by limiting failed access attempts.

#### Features:
- Configurable max attempts (default: 5)
- Configurable lockout duration (default: 15 minutes)
- Per-credential tracking (service + account)
- Automatic counter reset on successful access
- Admin unlock capability

#### Configuration:

```typescript
import { RateLimiter } from './credentials';

const rateLimiter = new RateLimiter(db);

// Get configuration
const config = rateLimiter.getConfig();
console.log(config);
// { maxAttempts: 5, lockoutDuration: 900000 }

// Update configuration (requires admin)
rateLimiter.updateConfig({
  maxAttempts: 3,
  lockoutDuration: 1800000 // 30 minutes
});

// Check if account is locked
const status = rateLimiter.checkRateLimit('my-api', 'production');
if (!status.allowed) {
  console.log(`Locked until: ${status.lockedUntil}`);
}

// Admin unlock
rateLimiter.adminUnlock('my-api', 'production');
```

#### Audit Integration:
All rate limit events are logged:
- `rate_limit_hit` - Max attempts exceeded
- `rate_limit_locked` - Account locked
- `rate_limit_unlocked` - Admin unlock performed

### Audit Logging

Comprehensive audit trail for compliance and forensic investigation.

#### Features:
- All CRUD operations logged
- Failed access attempts logged
- Admin operations logged
- Severity levels (INFO, WARNING, ERROR, CRITICAL)
- Rich filtering and querying
- Statistical analysis

#### Event Types:

**CRUD Operations:**
- `credential_added`
- `credential_retrieved`
- `credential_updated`
- `credential_deleted`

**Rate Limiting:**
- `rate_limit_hit`
- `rate_limit_locked`
- `rate_limit_unlocked`

**Access Failures:**
- `access_denied_not_found`
- `access_denied_rate_limited`
- `access_denied_validation`

**Admin Operations:**
- `admin_unlock_account`
- `admin_cleanup_expired`

**System Events:**
- `vault_initialized`
- `vault_closed`

#### Usage:

```typescript
import { AuditLogger, AuditEventType, AuditSeverity } from './credentials';

const auditLogger = new AuditLogger(db);

// Query audit logs
const logs = auditLogger.query({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  eventTypes: [AuditEventType.CREDENTIAL_ADDED, AuditEventType.CREDENTIAL_DELETED],
  service: 'my-api',
  severity: AuditSeverity.WARNING,
  success: false,
  limit: 100
});

// Get statistics
const stats = auditLogger.getStats();
console.log(stats);
/*
{
  totalEvents: 1250,
  successfulEvents: 1180,
  failedEvents: 70,
  eventsByType: {
    'credential_added': 450,
    'credential_retrieved': 650,
    'access_denied_rate_limited': 50,
    ...
  },
  eventsBySeverity: {
    'info': 1180,
    'warning': 60,
    'error': 10
  },
  recentEvents: [...]
}
*/

// Get events by severity
const criticalEvents = auditLogger.queryBySeverity(AuditSeverity.CRITICAL);

// Cleanup old logs (90 days retention)
const deleted = auditLogger.cleanupOldLogs(90);
console.log(`Deleted ${deleted} old log entries`);
```

### Rotation Policies

Automated credential rotation to enforce security best practices.

#### Features:
- Configurable rotation intervals (daily, weekly, monthly, yearly, custom)
- Automatic expiration tracking
- Grace period for rotation
- Rotation statistics
- Batch rotation operations

#### Usage:

```typescript
import { RotationPolicy, RotationInterval } from './credentials';

const rotationPolicy = new RotationPolicy(db);

// Configure rotation for a credential
rotationPolicy.setPolicy('my-api', 'production', {
  interval: RotationInterval.MONTHLY,
  gracePeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
  enabled: true
});

// Check if rotation needed
const status = rotationPolicy.needsRotation('my-api', 'production');
if (status.needsRotation) {
  console.log(`Rotation needed! Expires: ${status.expiresAt}`);
  console.log(`Days remaining: ${status.daysRemaining}`);

  // Perform rotation
  const newCred = await generateNewCredential();
  await vault.update('my-api', 'production', { credential: newCred });

  // Mark as rotated
  rotationPolicy.markRotated('my-api', 'production');
}

// Get all expired credentials
const expired = rotationPolicy.getExpiredCredentials();
for (const cred of expired) {
  console.log(`${cred.service}/${cred.account} expired ${cred.daysOverdue} days ago`);
}

// Batch rotate credentials
const results = await rotationPolicy.batchRotate(vault, async (service, account) => {
  // Your rotation logic
  return { apiKey: await generateNewApiKey() };
});

console.log(`Rotated: ${results.rotatedCount}, Failed: ${results.failedCount}`);

// Get statistics
const stats = rotationPolicy.getStats();
console.log(stats);
/*
{
  totalPolicies: 45,
  enabledPolicies: 42,
  expiredCredentials: 3,
  upcomingExpirations: 8,
  averageRotationAge: 25.5,
  policiesByInterval: {
    'monthly': 30,
    'yearly': 10,
    'quarterly': 2
  }
}
*/
```

### Access Control (RBAC)

Role-Based Access Control with fine-grained permissions.

#### Features:
- Built-in roles (ADMIN, USER, READ_ONLY, AUDITOR)
- Custom role creation
- Per-credential and per-service ACLs
- Service pattern matching (glob-style)
- Expiring permissions and roles
- Permission inheritance
- Identity types (user, process, service)

#### Built-in Roles:

| Role | Permissions | Description |
|------|-------------|-------------|
| **ADMIN** | All | Full administrative access |
| **USER** | READ, WRITE, ROTATE | Standard user operations |
| **READ_ONLY** | READ | Read-only access |
| **AUDITOR** | READ, AUDIT | Read and audit log access |

#### Permissions:

- `READ` - Retrieve credentials
- `WRITE` - Add/update credentials
- `DELETE` - Delete credentials
- `ADMIN` - Manage policies, unlock accounts (grants all permissions)
- `ROTATE` - Mark credentials as rotated
- `AUDIT` - View audit logs

#### Usage:

```typescript
import {
  AccessControl,
  Permission,
  Role,
  type Identity
} from './credentials';

// Create vault with identity
const vault = new CredentialVault(undefined, {
  id: 'user-123',
  type: 'user'
});

// Assign role
vault.assignRole({ id: 'user-123', type: 'user' }, Role.USER);

// Create custom role
const customRole = vault.createRole({
  name: 'deployer',
  description: 'Can deploy to production',
  permissions: [Permission.READ, Permission.WRITE]
});

// Grant specific permissions (ACL)
vault.grantPermissions({
  identityId: 'user-123',
  identityType: 'user',
  service: 'production-db',
  account: 'admin',
  permissions: [Permission.DELETE]
});

// Grant permissions with service pattern
vault.grantPermissions({
  identityId: 'deploy-bot',
  identityType: 'process',
  servicePattern: 'production-*', // Matches production-api, production-db, etc.
  permissions: [Permission.READ, Permission.WRITE]
});

// Grant expiring permissions
vault.grantPermissions({
  identityId: 'contractor',
  identityType: 'user',
  service: 'staging-api',
  permissions: [Permission.READ],
  expiresAt: new Date('2025-12-31')
});

// Check permissions
const permCheck = vault.checkPermission(
  Permission.DELETE,
  'production-db',
  'admin',
  { id: 'user-123', type: 'user' }
);

if (permCheck.allowed) {
  console.log('Permission granted');
  console.log('Effective permissions:', permCheck.effectivePermissions);
} else {
  console.log('Permission denied:', permCheck.reason);
}

// List user's access entries
const entries = vault.listAccessEntries({ id: 'user-123', type: 'user' });
for (const entry of entries) {
  console.log(`${entry.service}: ${entry.permissions.join(', ')}`);
}

// Revoke permissions
vault.revokePermissions(
  { id: 'user-123', type: 'user' },
  'production-db',
  'admin'
);

// Check if user is admin
if (vault.isAdmin({ id: 'user-123', type: 'user' })) {
  console.log('User has admin privileges');
}
```

#### Permission Evaluation:

Permissions are evaluated as the **union** of:
1. **Role permissions** - All permissions from assigned roles
2. **ACL permissions** - Specific grants for services/accounts
3. **ADMIN inheritance** - ADMIN permission grants all other permissions

Example:
```typescript
// User has USER role (READ, WRITE, ROTATE)
vault.assignRole(identity, Role.USER);

// Plus specific DELETE permission for production-db
vault.grantPermissions({
  identityId: identity.id,
  identityType: identity.type,
  service: 'production-db',
  permissions: [Permission.DELETE]
});

// Effective permissions:
// - READ, WRITE, ROTATE (from USER role)
// - DELETE (from ACL for production-db)
//
// Can DELETE production-db: YES ✅
// Can DELETE other services: NO ❌
```

## API Reference

### CredentialVault

Main vault class for credential management.

#### Constructor

```typescript
constructor(dbPath?: string, identity?: Identity)
```

- `dbPath` - Path to SQLite database (default: `~/.credentials/vault.db`)
- `identity` - User/process identity for access control (optional)

#### CRUD Operations

```typescript
// Add credential
async add(input: CredentialInput): Promise<Credential>

// Get credential
async get(service: string, account: string): Promise<Credential | null>

// Update credential
async update(service: string, account: string, updates: Partial<CredentialInput>): Promise<void>

// Delete credential
async delete(service: string, account: string): Promise<void>

// List credentials
list(filter?: CredentialFilter): Credential[]

// Close vault
async close(): Promise<void>
```

#### Rate Limiting

```typescript
getRateLimitConfig(): RateLimitConfig
updateRateLimitConfig(config: Partial<RateLimitConfig>): void
checkRateLimit(service: string, account: string): RateLimitStatus
adminUnlockAccount(service: string, account: string): void
```

#### Audit Logging

```typescript
queryAuditLogs(filter?: AuditLogFilter): AuditLogEntry[]
getAuditStats(): AuditStats
queryAuditLogsBySeverity(severity: AuditSeverity): AuditLogEntry[]
cleanupOldAuditLogs(retentionDays: number): number
```

#### Rotation Policies

```typescript
setRotationPolicy(service: string, account: string, policy: RotationPolicyConfig): void
getRotationPolicy(service: string, account: string): RotationPolicyConfig | null
removeRotationPolicy(service: string, account: string): void
checkRotationStatus(service: string, account: string): RotationStatus | null
markCredentialRotated(service: string, account: string): void
getExpiredCredentials(): RotationStatus[]
getRotationStats(): RotationStats
```

#### Access Control

```typescript
// Identity management
setIdentity(identity: Identity): void
getIdentity(): Identity | undefined

// Role management
createRole(config: Omit<RoleConfig, 'id' | 'isBuiltIn' | 'createdAt'>): RoleConfig
getRole(name: string): RoleConfig | null
listRoles(): RoleConfig[]
deleteRole(name: string): void

// Role assignment
assignRole(identity: Identity, roleName: string, options?: {...}): void
revokeRole(identity: Identity, roleName: string): void
getRoles(identity: Identity): RoleConfig[]

// Permission management
grantPermissions(entry: Omit<AccessControlEntry, 'id' | 'grantedAt'>): void
revokePermissions(identity: Identity, service?: string, account?: string): void
checkPermission(permission: Permission, service: string, account?: string, identity?: Identity): PermissionCheckResult
listAccessEntries(identity: Identity): AccessControlEntry[]

// Utility
isAdmin(identity?: Identity): boolean
```

## Best Practices

### Security

1. **Always use platform-native storage** when available (Keychain/Credential Manager/Secret Service)
2. **Enable rate limiting** to prevent brute-force attacks
3. **Configure rotation policies** for sensitive credentials (APIs, database passwords)
4. **Review audit logs regularly** for suspicious activity
5. **Use least-privilege access** - Grant minimum required permissions
6. **Set expiration dates** for temporary access grants
7. **Monitor rotation statistics** to ensure compliance

### Performance

1. **Use batch operations** when rotating multiple credentials
2. **Clean up old audit logs** periodically (90-day retention recommended)
3. **Close vault connections** when done to release resources
4. **Use service patterns** instead of multiple individual ACL entries

### Development

1. **Test with temporary databases** (`:memory:` or temp files)
2. **Clean up test databases** in afterEach hooks
3. **Mock secure storage** for faster tests
4. **Test permission boundaries** thoroughly

Example test setup:
```typescript
describe('My Tests', () => {
  let vault: CredentialVault;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = `/tmp/test-vault-${Date.now()}.db`;
    vault = new CredentialVault(testDbPath, {
      id: 'test-user',
      type: 'user'
    });
    vault.assignRole({ id: 'test-user', type: 'user' }, Role.ADMIN);
  });

  afterEach(async () => {
    await vault.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should work', async () => {
    // Your test
  });
});
```

## Testing

Comprehensive test suite with 100% coverage of security features.

```bash
# Run all tests
npm test

# Run specific test file
npm test -- rate-limiter.test.ts
npm test -- audit-logger.test.ts
npm test -- rotation-policy.test.ts
npm test -- access-control.test.ts

# Run with coverage
npm test -- --coverage
```

### Test Statistics:

- **Rate Limiter**: 11 tests
- **Audit Logger**: 26 tests
- **Rotation Policy**: 23 tests
- **Access Control**: 60 tests
- **Total**: 120+ tests

All tests include:
- Unit tests for core functionality
- Integration tests with CredentialVault
- Error handling and edge cases
- Security boundary testing
- Backward compatibility tests

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- All tests pass
- New features have comprehensive tests
- Security features maintain audit trail
- Documentation is updated
