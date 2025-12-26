# Credential Management System - Architecture

## System Overview

The Smart Agents Credential Management System is an enterprise-grade, multi-tenant platform for secure credential storage, automated rotation, and comprehensive auditing.

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        API Layer (Integration)                          │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ Rate Limiter │  │  Cache Layer │  │   Realtime   │                 │
│  │   (Per-Tenant│  │    (LRU +    │  │  Notifier    │                 │
│  │   Quotas)    │  │    Redis)    │  │  (WebSocket) │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
└────────────────────────────────────────────────────────────────────────┘
                                   ↓
┌────────────────────────────────────────────────────────────────────────┐
│                 TenantAwareCredentialVault                             │
│              (Multi-tenant isolation, quota enforcement)                │
└───────────────────────────┬────────────────────────────────────────────┘
                            │
          ┌─────────────────┴─────────────────┐
          │                                   │
          ▼                                   ▼
┌──────────────────┐              ┌──────────────────────┐
│ CredentialVault  │              │ MultiTenantManager   │
│ (Core CRUD)      │              │ (Tenant lifecycle)   │
└────────┬─────────┘              └──────────────────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│ SecureStorage    │   │ SQLite Database  │
│ (Pluggable       │   │ (Metadata)       │
│  Backends)       │   │                  │
└───────┬──────────┘   └──────────────────┘
        │
        ├─── Platform Native
        │    ├─ macOS Keychain
        │    ├─ Windows Credential Manager
        │    └─ Linux Secret Service
        │
        ├─── Cloud Providers
        │    ├─ AWS Secrets Manager
        │    ├─ HashiCorp Vault
        │    └─ Azure Key Vault
        │
        ├─── High Availability
        │    └─ StoragePool (Failover + Load Balancing)
        │
        └─── Fallback
             └─ EncryptedFileStorage
```

## Component Layers

### 1. API Layer (Integration & Scalability)

**Purpose**: Provide performance optimization, rate limiting, and real-time capabilities

**Components**:

- **RateLimiter**: Per-tenant rate limiting with sliding window algorithm
  - In-memory storage with configurable limits
  - Redis-backed distributed rate limiting
  - Rate limit headers (X-RateLimit-*)
  - Automatic cleanup of expired entries

- **CacheLayer**: Multi-level caching for performance
  - LRUCache: In-memory least-recently-used cache
  - CredentialCache: Specialized credential caching
  - DistributedCache: Redis-backed distributed cache
  - Cache statistics and hit rate tracking

- **RealtimeNotifier**: WebSocket event broadcasting
  - Event types: create, update, delete, rotate, expire, quota, security
  - Subscription filtering by tenant, event type, service
  - Event history with configurable retention
  - Async subscriber callbacks

### 2. Multi-Tenant Layer

**Purpose**: Tenant isolation, quota management, and lifecycle

**Components**:

- **TenantAwareCredentialVault**: Wrapper providing multi-tenant capabilities
  - Automatic tenant ID prefixing for isolation
  - Quota enforcement before operations
  - Tenant validation and status checking
  - Admin cross-tenant operations

- **MultiTenantManager**: Tenant lifecycle management
  - Tenant CRUD (create, update, delete, list)
  - User management per tenant
  - Quota configuration and tracking
  - Usage statistics and monitoring
  - Tier-based default quotas (FREE, BASIC, PROFESSIONAL, ENTERPRISE)

### 3. Core Vault Layer

**Purpose**: Core credential management operations

**Components**:

- **CredentialVault**: Main credential operations
  - CRUD operations with validation
  - Metadata management
  - Integration with all security features
  - Transaction support

### 4. Security Features Layer

**Purpose**: Security, compliance, and automation

**Components**:

- **AuditLogger**: Comprehensive audit trail
  - All CRUD operations logged
  - Security events (rate limit, access denied)
  - Queryable with filters
  - Statistics and reporting

- **RotationService**: Automated credential rotation
  - Policy-based rotation scheduling
  - Pluggable rotation providers
  - Automatic rollback on failure
  - Rotation statistics

- **ExpirationMonitor**: Credential expiration tracking
  - Warning levels (7, 14, 30 days)
  - Automatic status updates
  - Expiration notifications
  - Cleanup of expired credentials

- **UsageTracker**: Usage analytics and anomaly detection
  - Access pattern tracking
  - Anomaly detection (unusual frequency, off-hours access)
  - Trend analysis (hourly, daily, weekly, monthly)
  - Service usage statistics

- **HealthChecker**: System health monitoring
  - Component health checks (database, storage, cache, queue)
  - Performance metrics (latency, throughput, error rate)
  - Resource utilization (CPU, memory, connections)
  - Degraded/unhealthy detection

- **AlertingService**: Multi-channel alerting
  - Alert types: rotation_due, credential_expired, quota_exceeded, security_threat
  - Severity levels: INFO, WARNING, ERROR, CRITICAL
  - Channels: email, webhook, SMS, custom
  - Alert rules and notification tracking
  - Acknowledgment and resolution workflow

- **AccessControl**: Role-based access control (RBAC)
  - Built-in roles (ADMIN, USER, READ_ONLY, AUDITOR)
  - Custom role creation
  - Fine-grained ACLs per credential
  - Permission checking with inheritance

### 5. Advanced Features Layer

**Purpose**: Enterprise features for credential sharing, versioning, and disaster recovery

**Components**:

- **SharingService**: Secure credential sharing
  - Four permission levels (READ, READ_ROTATE, READ_ROTATE_SHARE, FULL)
  - Temporary access tokens
  - Share expiration and revocation
  - Audit trail for all sharing operations
  - Statistics and reporting

- **SecretGenerator**: Secure credential generation
  - Strong password generation with configurable policies
  - API key generation with prefixes
  - Secret templates (database password, API key, encryption key, etc.)
  - Password strength estimation
  - UUID and token generation

- **VersionedSecretStore**: Secret version management
  - Automatic version tracking on changes
  - Version history with metadata
  - Rollback to previous versions
  - Version comparison and diffs
  - Retention policies

- **BackupService**: Disaster recovery
  - Automated scheduled backups
  - Compression (gzip) and encryption (AES-256-CBC)
  - SHA-256 checksums for integrity
  - Multiple destinations (local, S3, Azure Blob)
  - Retention policies and cleanup
  - Backup verification

### 6. Storage Layer

**Purpose**: Secure credential value storage

**Storage Backends**:

- **Platform Native**:
  - MacOSKeychain: macOS Keychain Services API
  - WindowsCredentialManager: Windows Credential Manager API
  - LinuxSecretService: D-Bus Secret Service API

- **Cloud Providers**:
  - AWSSecretsManager: AWS Secrets Manager with KMS encryption
  - HashiCorpVault: HashiCorp Vault KV v1/v2
  - AzureKeyVault: Azure Key Vault with RBAC

- **High Availability**:
  - StoragePool: Multiple backends with circuit breaker
    - Load balancing strategies (priority, round-robin, weighted, least-used)
    - Automatic failover on errors
    - Health checking
    - Circuit breaker pattern

- **Fallback**:
  - EncryptedFileStorage: AES-256-GCM encrypted JSON storage

## Data Flow

### Credential Storage (Multi-Tenant)

```
1. API Request (HTTP/REST/GraphQL)
   ↓
2. Rate Limiter Check
   ├─ Rate limit exceeded → 429 Too Many Requests
   └─ Allowed → Continue
   ↓
3. TenantAwareCredentialVault.set()
   ├─ Validate tenant exists and active
   ├─ Check quota (credential count limit)
   ├─ Add tenant prefix to credential ID
   └─ Call CredentialVault.set()
       ↓
4. CredentialVault.set()
   ├─ Validate input
   ├─ Check access control permissions
   ├─ Store value in SecureStorage
   ├─ Store metadata in SQLite
   ├─ Log to AuditLogger
   └─ Trigger RealtimeNotifier.emit(CREDENTIAL_CREATED)
       ↓
5. Update tenant usage statistics
   ├─ Increment credential count
   └─ Record API call
       ↓
6. Cache invalidation (if applicable)
   ↓
7. Return success response
```

### Credential Retrieval (Multi-Tenant)

```
1. API Request
   ↓
2. Rate Limiter Check
   ↓
3. Cache Check
   ├─ Cache hit → Return cached credential
   └─ Cache miss → Continue
       ↓
4. TenantAwareCredentialVault.get()
   ├─ Validate tenant
   ├─ Add tenant prefix to lookup
   └─ Call CredentialVault.get()
       ↓
5. CredentialVault.get()
   ├─ Check access control permissions
   ├─ Get metadata from SQLite
   ├─ Get value from SecureStorage
   ├─ Log to AuditLogger
   ├─ Update UsageTracker
   └─ Trigger RealtimeNotifier.emit(CREDENTIAL_ACCESSED)
       ↓
6. Cache credential (if enabled)
   ↓
7. Record API call for tenant
   ↓
8. Return credential
```

### Automated Rotation

```
1. RotationService.processScheduledRotations() (scheduled job)
   ↓
2. For each due rotation:
   ├─ Check ExpirationMonitor for expiration status
   ├─ Call rotation provider for service
   ├─ Get new credential value
   ├─ Update credential in vault
   ├─ Create new version in VersionedSecretStore
   ├─ Mark as rotated in RotationPolicy
   ├─ Log to AuditLogger
   └─ Trigger RealtimeNotifier.emit(CREDENTIAL_ROTATED)
       ↓
3. On failure:
   ├─ Attempt rollback (if possible)
   ├─ Trigger AlertingService (ROTATION_FAILED)
   └─ Log error in AuditLogger
```

## Database Schema

### Core Tables

```sql
-- Credentials metadata
CREATE TABLE credentials (
  id TEXT PRIMARY KEY,           -- "tenantId:service:account"
  service TEXT NOT NULL,
  account TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  metadata TEXT                  -- JSON
);

-- Tenants
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL,            -- FREE, BASIC, PROFESSIONAL, ENTERPRISE
  status TEXT NOT NULL,          -- ACTIVE, SUSPENDED, DISABLED, PENDING
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  settings TEXT,                 -- JSON
  metadata TEXT                  -- JSON
);

-- Tenant quotas
CREATE TABLE tenant_quotas (
  tenant_id TEXT PRIMARY KEY,
  max_credentials INTEGER NOT NULL DEFAULT 100,
  max_users INTEGER NOT NULL DEFAULT 10,
  max_storage_bytes INTEGER NOT NULL DEFAULT 10485760,
  max_api_calls_per_hour INTEGER NOT NULL DEFAULT 1000,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Tenant users
CREATE TABLE tenant_users (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  added_by TEXT,
  metadata TEXT,
  PRIMARY KEY (tenant_id, user_id)
);

-- Credential shares
CREATE TABLE credential_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  account TEXT NOT NULL,
  shared_by_id TEXT NOT NULL,
  shared_by_type TEXT NOT NULL,
  shared_with_id TEXT NOT NULL,
  shared_with_type TEXT NOT NULL,
  permission TEXT NOT NULL,      -- READ, READ_ROTATE, READ_ROTATE_SHARE, FULL
  status TEXT NOT NULL,          -- ACTIVE, EXPIRED, REVOKED, PENDING
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  revoked_by_id TEXT,
  revoked_by_type TEXT,
  access_token TEXT,
  metadata TEXT
);

-- Secret versions
CREATE TABLE secret_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL,
  account TEXT NOT NULL,
  version INTEGER NOT NULL,
  value_hash TEXT NOT NULL,      -- SHA-256 hash
  created_by_id TEXT NOT NULL,
  created_by_type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  change_description TEXT,
  metadata TEXT,
  UNIQUE(service, account, version)
);

-- Backup metadata
CREATE TABLE backup_metadata (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  size INTEGER NOT NULL,
  compressed INTEGER NOT NULL,
  encrypted INTEGER NOT NULL,
  checksum TEXT NOT NULL,        -- SHA-256
  credential_count INTEGER NOT NULL,
  destination TEXT NOT NULL,
  version TEXT NOT NULL,
  metadata TEXT
);

-- Audit logs
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  service TEXT,
  account TEXT,
  success INTEGER NOT NULL,
  details TEXT,                  -- JSON
  severity TEXT NOT NULL         -- INFO, WARNING, ERROR, CRITICAL
);

-- Rotation policies
CREATE TABLE rotation_policies (
  service TEXT NOT NULL,
  account TEXT NOT NULL,
  rotate_every_days INTEGER NOT NULL,
  rotate_before_expiry_days INTEGER,
  last_rotated_at INTEGER,
  next_rotation_at INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  max_rotation_attempts INTEGER DEFAULT 3,
  metadata TEXT,
  PRIMARY KEY (service, account)
);

-- Access control
CREATE TABLE ac_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT NOT NULL,     -- JSON array
  is_built_in INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  metadata TEXT
);

CREATE TABLE ac_role_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identity_id TEXT NOT NULL,
  identity_type TEXT NOT NULL,
  role_name TEXT NOT NULL,
  granted_at INTEGER NOT NULL,
  granted_by_id TEXT,
  granted_by_type TEXT,
  expires_at INTEGER,
  metadata TEXT
);

CREATE TABLE ac_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identity_id TEXT NOT NULL,
  identity_type TEXT NOT NULL,
  service TEXT,
  account TEXT,
  service_pattern TEXT,
  permissions TEXT NOT NULL,     -- JSON array
  granted_at INTEGER NOT NULL,
  granted_by_id TEXT,
  granted_by_type TEXT,
  expires_at INTEGER,
  metadata TEXT
);
```

## Security Considerations

### Encryption

- **At Rest**: All credential values encrypted in storage backends
- **In Transit**: TLS for all API communications
- **Backups**: AES-256-CBC encryption with separate keys
- **Database**: SQLite metadata database (no sensitive values)

### Access Control

- **Multi-Tenant Isolation**: Tenant ID prefix prevents cross-tenant access
- **RBAC**: Role-based permissions with fine-grained ACLs
- **Audit Trail**: All operations logged for compliance
- **Rate Limiting**: Prevent brute-force and abuse

### High Availability

- **Storage Pool**: Multiple backends with automatic failover
- **Circuit Breaker**: Prevent cascading failures
- **Health Checks**: Continuous monitoring of components
- **Caching**: Reduce load on backends

## Performance Characteristics

### Throughput

- **Cached reads**: 10,000+ ops/sec
- **Uncached reads**: 1,000+ ops/sec
- **Writes**: 500+ ops/sec
- **Batch operations**: 5,000+ credentials/sec

### Latency

- **Cached get**: <10ms (p50), <20ms (p99)
- **Uncached get**: <50ms (p50), <100ms (p99)
- **Set**: <100ms (p50), <200ms (p99)
- **Delete**: <50ms (p50), <100ms (p99)

### Scalability

- **Vertical**: Single instance handles 10,000+ tenants
- **Horizontal**: Stateless API layer with Redis for shared state
- **Database**: SQLite with WAL mode for concurrent reads
- **Storage**: Cloud providers scale independently

## Deployment Architecture

### Single Instance (Development)

```
┌──────────────────────────┐
│   Smart Agents App       │
│                          │
│  ┌────────────────────┐  │
│  │ Credential Manager │  │
│  │  + SQLite DB       │  │
│  │  + Keychain/CM     │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

### Production (Horizontal Scaling)

```
                   ┌─────────────────┐
                   │  Load Balancer  │
                   └────────┬────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐   ┌───────────┐
    │ API Node 1│    │ API Node 2│   │ API Node 3│
    └─────┬─────┘    └─────┬─────┘   └─────┬─────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐     ┌──────────┐    ┌──────────┐
    │  Redis   │     │ SQLite   │    │   AWS    │
    │ (Cache & │     │(Metadata)│    │ Secrets  │
    │  Queue)  │     │          │    │ Manager  │
    └──────────┘     └──────────┘    └──────────┘
```

## Future Enhancements

1. **GraphQL API**: Full GraphQL schema with subscriptions
2. **Key Management Service**: Dedicated KMS for encryption keys
3. **Compliance Reports**: Automated compliance reporting (SOC 2, ISO 27001)
4. **Machine Learning**: Anomaly detection with ML models
5. **Blockchain Audit**: Immutable audit log on blockchain
6. **Secret Scanning**: Scan code repositories for leaked credentials
7. **Zero-Knowledge Proofs**: Client-side encryption with ZKP
8. **Federated Identity**: SSO integration (SAML, OAuth)
