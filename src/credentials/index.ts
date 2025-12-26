/**
 * Credential Management System
 *
 * Simplified credential storage for Smart Agents
 * Focused on AI API key management (Claude, OpenAI, Grok, Gemini)
 */

// Core credential management
export * from './types.js';
export * from './storage/index.js';
export * from './validation.js';
export { CredentialVault } from './CredentialVault.js';

// Basic auditing and security
export { AuditLogger, AuditEventType, AuditSeverity, type AuditLogEntry, type AuditLogFilter, type AuditStats } from './AuditLogger.js';
export { AccessControl, Permission, Role, type Identity, type RoleConfig, type AccessControlEntry, type PermissionCheckResult } from './AccessControl.js';

// Essential monitoring
export { RotationPolicy, type RotationPolicyConfig, type RotationStatus, type RotationStats } from './RotationPolicy.js';
export { ExpirationMonitor, ExpirationWarningLevel, type ExpirationStatus, type ExpirationWarning, type ExpirationStats } from './ExpirationMonitor.js';

/**
 * NOTE: Enterprise features removed to match Smart Agents' scale:
 *
 * Removed (overkill for AI orchestration):
 * - RotationService (RotationPolicy provides basic rotation)
 * - UsageTracker (cost tracking handled by cost-tracker.ts)
 * - HealthChecker (not needed for simple API key storage)
 * - AlertingService (over-engineered for current needs)
 * - BackupService (platform-native storage provides backup)
 * - SharingService (single-user system)
 * - SecretGenerator (API keys provided by services)
 * - VersionedSecretStore (unnecessary for API keys)
 * - MultiTenantManager (not a multi-tenant system)
 * - TenantAwareCredentialVault (not needed)
 * - api/* (RateLimiter, CacheLayer, RealtimeNotifier - all overkill)
 *
 * The simplified system focuses on:
 * ✅ Secure storage of AI API keys
 * ✅ Basic rotation policies
 * ✅ Audit logging for security
 * ✅ Expiration monitoring
 * ✅ Platform-native backends (macOS Keychain)
 */
