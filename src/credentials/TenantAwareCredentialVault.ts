/**
 * Tenant-Aware Credential Vault
 *
 * Wraps CredentialVault with multi-tenancy support:
 * - Automatic tenant isolation
 * - Quota enforcement
 * - Tenant-specific policies
 * - Cross-tenant operations (admin only)
 */

import type Database from 'better-sqlite3';
import { CredentialVault } from './CredentialVault.js';
import { MultiTenantManager, TenantStatus } from './MultiTenantManager.js';
import { AuditLogger, AuditEventType } from './AuditLogger.js';
import type { Credential, CredentialQuery, SecureStorage } from './types.js';
import type { Identity } from './AccessControl.js';
import { logger } from '../utils/logger.js';
import { MULTI_TENANT } from './constants.js';

/**
 * Tenant context for operations
 */
export interface TenantContext {
  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * Identity performing the operation
   */
  identity: Identity;

  /**
   * Is this a cross-tenant admin operation
   */
  isCrossTenant?: boolean;
}

/**
 * Tenant-aware credential operation result
 */
export interface TenantOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  quotaExceeded?: boolean;
  tenantDisabled?: boolean;
}

/**
 * Tenant-Aware Credential Vault
 */
export class TenantAwareCredentialVault {
  private vault: CredentialVault;
  private tenantManager: MultiTenantManager;
  private auditLogger: AuditLogger;
  private db: Database.Database;

  // Tenant validation cache to reduce database queries
  private tenantValidationCache: Map<string, { isValid: boolean; timestamp: number }> = new Map();
  private readonly VALIDATION_CACHE_TTL = MULTI_TENANT.VALIDATION_CACHE_TTL_MS;

  constructor(
    db: Database.Database,
    storage: SecureStorage,
    auditLogger: AuditLogger
  ) {
    this.db = db;
    // Use factory method for dependency injection
    this.vault = CredentialVault.createWithDI(db, storage, auditLogger);
    this.tenantManager = new MultiTenantManager(db, auditLogger);
    this.auditLogger = auditLogger;

    logger.info('Tenant-aware credential vault initialized with dependency injection');
  }

  /**
   * Get tenant manager (for tenant administration)
   */
  getTenantManager(): MultiTenantManager {
    return this.tenantManager;
  }

  /**
   * Get underlying vault (for admin operations)
   */
  getVault(): CredentialVault {
    return this.vault;
  }

  /**
   * Store a credential with tenant isolation
   */
  async set(
    context: TenantContext,
    credential: Omit<Credential, 'id'>
  ): Promise<TenantOperationResult<void>> {
    // Validate tenant
    const validationResult = this.validateTenant(context);
    if (!validationResult.success) {
      return validationResult;
    }

    // Check quota
    const quotaCheck = this.tenantManager.checkQuota(context.tenantId, 'credential', 1);
    if (!quotaCheck.allowed) {
      logger.warn('Credential creation blocked by quota', {
        tenantId: context.tenantId,
        reason: quotaCheck.reason,
      });

      return {
        success: false,
        quotaExceeded: true,
        error: quotaCheck.reason,
      };
    }

    try {
      // Convert to CredentialInput (CredentialVault.add will generate the ID)
      const credentialInput = {
        service: credential.service,
        account: credential.account,
        value: credential.value,
        expiresAt: credential.metadata?.expiresAt,
        notes: credential.metadata?.notes,
        tags: credential.metadata?.tags,
      };

      await this.vault.add(credentialInput);

      // Record API call
      this.tenantManager.recordApiCall(context.tenantId);

      // Audit log
      this.auditLogger.log(AuditEventType.CREDENTIAL_CREATED, {
        service: credential.service,
        account: credential.account,
        success: true,
        details: JSON.stringify({
          tenantId: context.tenantId,
          identity: `${context.identity.type}:${context.identity.id}`,
        }),
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to store credential', {
        tenantId: context.tenantId,
        service: credential.service,
        account: credential.account,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get a credential with tenant isolation
   */
  async get(
    context: TenantContext,
    service: string,
    account: string
  ): Promise<TenantOperationResult<Credential | null>> {
    // Validate tenant
    const validationResult = this.validateTenant(context);
    if (!validationResult.success) {
      return validationResult as TenantOperationResult<Credential | null>;
    }

    try {
      const tenantedId = this.getTenantedId(context.tenantId, service, account);
      const credential = await this.vault.get(service, account);

      // Verify credential belongs to tenant
      if (credential && credential.id !== tenantedId) {
        logger.warn('Attempted to access credential from different tenant', {
          tenantId: context.tenantId,
          credentialId: credential.id,
        });

        return {
          success: false,
          error: 'Access denied: credential not found',
        };
      }

      // Record API call
      this.tenantManager.recordApiCall(context.tenantId);

      // Audit log
      this.auditLogger.log(AuditEventType.CREDENTIAL_ACCESSED, {
        service,
        account,
        success: true,
        details: JSON.stringify({
          tenantId: context.tenantId,
          identity: `${context.identity.type}:${context.identity.id}`,
        }),
      });

      return {
        success: true,
        data: credential,
      };
    } catch (error: any) {
      logger.error('Failed to get credential', {
        tenantId: context.tenantId,
        service,
        account,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a credential with tenant isolation
   */
  async delete(
    context: TenantContext,
    service: string,
    account: string
  ): Promise<TenantOperationResult<void>> {
    // Validate tenant
    const validationResult = this.validateTenant(context);
    if (!validationResult.success) {
      return validationResult;
    }

    try {
      const tenantedId = this.getTenantedId(context.tenantId, service, account);
      const credential = await this.vault.get(service, account);

      // Verify credential belongs to tenant
      if (credential && credential.id !== tenantedId) {
        logger.warn('Attempted to delete credential from different tenant', {
          tenantId: context.tenantId,
          credentialId: credential.id,
        });

        return {
          success: false,
          error: 'Access denied: credential not found',
        };
      }

      await this.vault.delete(service, account);

      // Record API call
      this.tenantManager.recordApiCall(context.tenantId);

      // Audit log
      this.auditLogger.log(AuditEventType.CREDENTIAL_DELETED, {
        service,
        account,
        success: true,
        details: JSON.stringify({
          tenantId: context.tenantId,
          identity: `${context.identity.type}:${context.identity.id}`,
        }),
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to delete credential', {
        tenantId: context.tenantId,
        service,
        account,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * List credentials with tenant isolation
   */
  async list(
    context: TenantContext,
    query?: CredentialQuery
  ): Promise<TenantOperationResult<Omit<Credential, 'value'>[]>> {
    // Validate tenant
    const validationResult = this.validateTenant(context);
    if (!validationResult.success) {
      return validationResult as TenantOperationResult<Omit<Credential, 'value'>[]>;
    }

    try {
      const allCredentials = await this.vault.list(query);

      // Filter to only credentials belonging to this tenant
      const tenantPrefix = `${context.tenantId}:`;
      const tenantCredentials = allCredentials.filter((cred) =>
        cred.id.startsWith(tenantPrefix)
      );

      // Record API call
      this.tenantManager.recordApiCall(context.tenantId);

      return {
        success: true,
        data: tenantCredentials,
      };
    } catch (error: any) {
      logger.error('Failed to list credentials', {
        tenantId: context.tenantId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update credential with tenant isolation
   */
  async update(
    context: TenantContext,
    service: string,
    account: string,
    updates: { value?: any; metadata?: Record<string, any> }
  ): Promise<TenantOperationResult<void>> {
    // Validate tenant
    const validationResult = this.validateTenant(context);
    if (!validationResult.success) {
      return validationResult;
    }

    try {
      const tenantedId = this.getTenantedId(context.tenantId, service, account);
      const credential = await this.vault.get(service, account);

      // Verify credential belongs to tenant
      if (!credential || credential.id !== tenantedId) {
        logger.warn('Attempted to update credential from different tenant', {
          tenantId: context.tenantId,
          service,
          account,
        });

        return {
          success: false,
          error: 'Access denied: credential not found',
        };
      }

      await this.vault.update(service, account, updates);

      // Record API call
      this.tenantManager.recordApiCall(context.tenantId);

      // Audit log
      this.auditLogger.log(AuditEventType.CREDENTIAL_UPDATED, {
        service,
        account,
        success: true,
        details: JSON.stringify({
          tenantId: context.tenantId,
          identity: `${context.identity.type}:${context.identity.id}`,
          fields: Object.keys(updates),
        }),
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to update credential', {
        tenantId: context.tenantId,
        service,
        account,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get usage statistics for tenant
   */
  getUsageStats(context: TenantContext): TenantOperationResult<any> {
    const validationResult = this.validateTenant(context);
    if (!validationResult.success) {
      return validationResult;
    }

    try {
      const stats = this.tenantManager.getUsageStats(context.tenantId);
      const quota = this.tenantManager.getQuota(context.tenantId);

      return {
        success: true,
        data: {
          usage: stats,
          quota,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate tenant status and access
   * Optimized with caching to reduce database queries
   */
  private validateTenant(context: TenantContext): TenantOperationResult<void> {
    // Check cache first (skip if cross-tenant admin operation)
    if (!context.isCrossTenant) {
      const cached = this.tenantValidationCache.get(context.tenantId);
      const now = Date.now();

      if (cached && now - cached.timestamp < this.VALIDATION_CACHE_TTL) {
        if (!cached.isValid) {
          return {
            success: false,
            tenantDisabled: true,
            error: `Tenant is not active`,
          };
        }
        return { success: true };
      }
    }

    // Validate tenant ID format (cheap check before database query)
    if (!context.tenantId || typeof context.tenantId !== 'string' || context.tenantId.length === 0) {
      return {
        success: false,
        error: `Invalid tenant ID format`,
      };
    }

    // Fetch from database
    const tenant = this.tenantManager.getTenant(context.tenantId);

    if (!tenant) {
      // Cache negative result
      this.tenantValidationCache.set(context.tenantId, {
        isValid: false,
        timestamp: Date.now(),
      });

      return {
        success: false,
        error: `Tenant not found: ${context.tenantId}`,
      };
    }

    const isActive = tenant.status === TenantStatus.ACTIVE;

    if (!isActive && !context.isCrossTenant) {
      // Cache negative result
      this.tenantValidationCache.set(context.tenantId, {
        isValid: false,
        timestamp: Date.now(),
      });

      return {
        success: false,
        tenantDisabled: true,
        error: `Tenant is ${tenant.status}`,
      };
    }

    // Cache positive result
    if (isActive) {
      this.tenantValidationCache.set(context.tenantId, {
        isValid: true,
        timestamp: Date.now(),
      });
    }

    return { success: true };
  }

  /**
   * Generate tenant-prefixed credential ID
   */
  private getTenantedId(tenantId: string, service: string, account: string): string {
    return `${tenantId}:${service}:${account}`;
  }

  /**
   * Parse tenant ID from credential ID
   */
  private parseTenantId(credentialId: string): string | null {
    const parts = credentialId.split(':');
    return parts.length >= 3 ? parts[0] : null;
  }

  /**
   * Admin operation: Get credential across tenants
   */
  async adminGet(
    adminIdentity: Identity,
    tenantId: string,
    service: string,
    account: string
  ): Promise<Credential | null> {
    logger.info('Admin cross-tenant access', {
      admin: `${adminIdentity.type}:${adminIdentity.id}`,
      tenantId,
      service,
      account,
    });

    const tenantedId = this.getTenantedId(tenantId, service, account);
    const credential = await this.vault.get(service, account);

    if (credential && credential.id === tenantedId) {
      return credential;
    }

    return null;
  }

  /**
   * Admin operation: List all credentials for a tenant
   */
  async adminListTenantCredentials(
    adminIdentity: Identity,
    tenantId: string
  ): Promise<Omit<Credential, 'value'>[]> {
    logger.info('Admin listing tenant credentials', {
      admin: `${adminIdentity.type}:${adminIdentity.id}`,
      tenantId,
    });

    const allCredentials = await this.vault.list();
    const tenantPrefix = `${tenantId}:`;

    return allCredentials.filter((cred) => cred.id.startsWith(tenantPrefix));
  }

  /**
   * Admin operation: Delete all credentials for a tenant
   */
  async adminDeleteTenantCredentials(
    adminIdentity: Identity,
    tenantId: string
  ): Promise<number> {
    logger.info('Admin deleting all tenant credentials', {
      admin: `${adminIdentity.type}:${adminIdentity.id}`,
      tenantId,
    });

    const credentials = await this.adminListTenantCredentials(adminIdentity, tenantId);
    let deletedCount = 0;

    for (const cred of credentials) {
      try {
        const [, service, account] = cred.id.split(':');
        await this.vault.delete(service, account);
        deletedCount++;
      } catch (error: any) {
        logger.error('Failed to delete credential', {
          credentialId: cred.id,
          error: error.message,
        });
      }
    }

    // Audit log
    this.auditLogger.log(AuditEventType.CREDENTIAL_DELETED, {
      service: 'admin',
      account: tenantId,
      success: true,
      details: JSON.stringify({
        action: 'delete_all_tenant_credentials',
        tenantId,
        deletedCount,
        admin: `${adminIdentity.type}:${adminIdentity.id}`,
      }),
    });

    return deletedCount;
  }

  /**
   * Close vault and cleanup resources
   */
  close(): void {
    this.vault.close();
  }
}
