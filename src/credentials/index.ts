/**
 * Credential Management System
 *
 * Platform-agnostic credential storage with secure backends
 */

export * from './types.js';
export * from './storage/index.js';
export { CredentialVault } from './CredentialVault.js';
export { AuditLogger, AuditEventType, AuditSeverity, type AuditLogEntry, type AuditLogFilter, type AuditStats } from './AuditLogger.js';
