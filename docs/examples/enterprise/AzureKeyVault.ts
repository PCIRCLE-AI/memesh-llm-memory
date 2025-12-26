/**
 * Azure Key Vault Storage Backend
 *
 * Provides secure credential storage using Azure Key Vault.
 * Supports:
 * - Secrets management
 * - Access policies and RBAC
 * - Soft-delete and purge protection
 * - Managed identities for authentication
 * - Audit logging via Azure Monitor
 */

import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import { logger } from '../../utils/logger.js';
import type { Credential, CredentialQuery, SecureStorage } from '../types.js';

/**
 * Azure Key Vault configuration
 */
export interface AzureKeyVaultConfig {
  /**
   * Key Vault URL (e.g., 'https://mykeyvault.vault.azure.net')
   */
  vaultUrl: string;

  /**
   * Authentication method
   */
  auth:
    | {
        type: 'default'; // Use DefaultAzureCredential (managed identity, Azure CLI, etc.)
      }
    | {
        type: 'service-principal';
        tenantId: string;
        clientId: string;
        clientSecret: string;
      };

  /**
   * Optional prefix for secret names
   */
  prefix?: string;

  /**
   * Enable soft delete (recommended for production)
   */
  enableSoftDelete?: boolean;

  /**
   * Recovery level (default: 'Recoverable+ProtectedSubscription')
   */
  recoveryLevel?:
    | 'Purgeable'
    | 'Recoverable+Purgeable'
    | 'Recoverable'
    | 'Recoverable+ProtectedSubscription'
    | 'CustomizedRecoverable+Purgeable'
    | 'CustomizedRecoverable'
    | 'CustomizedRecoverable+ProtectedSubscription';
}

/**
 * Azure Key Vault storage backend
 */
export class AzureKeyVault implements SecureStorage {
  private client: SecretClient;
  private config: AzureKeyVaultConfig;

  constructor(config: AzureKeyVaultConfig) {
    this.config = {
      enableSoftDelete: true,
      recoveryLevel: 'Recoverable+ProtectedSubscription',
      ...config,
    };

    // Initialize Azure credential
    const credential =
      this.config.auth.type === 'default'
        ? new DefaultAzureCredential()
        : new ClientSecretCredential(
            this.config.auth.tenantId,
            this.config.auth.clientId,
            this.config.auth.clientSecret
          );

    this.client = new SecretClient(this.config.vaultUrl, credential);

    logger.info('Azure Key Vault storage initialized', {
      vaultUrl: this.config.vaultUrl,
      authType: this.config.auth.type,
      prefix: this.config.prefix,
    });
  }

  /**
   * Generate secret name from service and account
   * Azure Key Vault secret names must match ^[0-9a-zA-Z-]+$
   */
  private getSecretName(service: string, account: string): string {
    // Replace invalid characters with hyphens
    const sanitize = (str: string) => str.replace(/[^0-9a-zA-Z-]/g, '-');

    const base = `${sanitize(service)}-${sanitize(account)}`;
    return this.config.prefix ? `${this.config.prefix}-${base}` : base;
  }

  /**
   * Parse secret name back to service and account
   */
  private parseSecretName(secretName: string): { service: string; account: string } | null {
    let name = secretName;
    if (this.config.prefix && name.startsWith(`${this.config.prefix}-`)) {
      name = name.slice(this.config.prefix.length + 1);
    }

    const lastHyphen = name.lastIndexOf('-');
    if (lastHyphen === -1) {
      return null;
    }

    return {
      service: name.slice(0, lastHyphen),
      account: name.slice(lastHyphen + 1),
    };
  }

  /**
   * Store a credential in Azure Key Vault
   */
  async set(credential: Credential): Promise<void> {
    const secretName = this.getSecretName(credential.service, credential.account);

    // Prepare secret value (store full credential as JSON)
    const secretValue = JSON.stringify({
      value: credential.value,
      metadata: credential.metadata,
    });

    // Prepare tags
    const tags: Record<string, string> = {
      service: credential.service,
      account: credential.account,
      'managed-by': 'smart-agents',
    };

    if (credential.metadata?.tags) {
      credential.metadata.tags.forEach((tag, index) => {
        tags[`tag-${index}`] = tag;
      });
    }

    try {
      await this.client.setSecret(secretName, secretValue, {
        tags,
        contentType: 'application/json',
      });

      logger.info('Credential stored in Azure Key Vault', {
        secretName,
        service: credential.service,
        account: credential.account,
      });
    } catch (error: any) {
      logger.error('Failed to store credential in Azure Key Vault', {
        error: error.message,
        secretName,
      });
      throw new Error(`Azure Key Vault set failed: ${error.message}`);
    }
  }

  /**
   * Retrieve a credential from Azure Key Vault
   */
  async get(service: string, account: string): Promise<Credential | null> {
    const secretName = this.getSecretName(service, account);

    try {
      const secret = await this.client.getSecret(secretName);

      if (!secret.value) {
        return null;
      }

      const secretData = JSON.parse(secret.value);

      const credential: Credential = {
        id: secret.properties.id || secretName,
        service,
        account,
        value: secretData.value,
        metadata: secretData.metadata
          ? {
              ...secretData.metadata,
              createdAt: secretData.metadata.createdAt
                ? new Date(secretData.metadata.createdAt)
                : secret.properties.createdOn || new Date(),
              updatedAt: secret.properties.updatedOn || new Date(),
            }
          : {
              createdAt: secret.properties.createdOn || new Date(),
              updatedAt: secret.properties.updatedOn || new Date(),
            },
      };

      logger.debug('Credential retrieved from Azure Key Vault', {
        secretName,
        service,
        account,
      });

      return credential;
    } catch (error: any) {
      if (error.statusCode === 404 || error.code === 'SecretNotFound') {
        return null;
      }

      logger.error('Failed to retrieve credential from Azure Key Vault', {
        error: error.message,
        secretName,
      });
      throw new Error(`Azure Key Vault get failed: ${error.message}`);
    }
  }

  /**
   * Delete a credential from Azure Key Vault
   */
  async delete(service: string, account: string): Promise<void> {
    const secretName = this.getSecretName(service, account);

    try {
      if (this.config.enableSoftDelete) {
        // Soft delete (can be recovered)
        await this.client.beginDeleteSecret(secretName);

        logger.info('Credential soft-deleted in Azure Key Vault', {
          secretName,
          service,
          account,
        });
      } else {
        // Immediate purge (permanent)
        const poller = await this.client.beginDeleteSecret(secretName);
        await poller.pollUntilDone();
        await this.client.purgeDeletedSecret(secretName);

        logger.info('Credential purged from Azure Key Vault', {
          secretName,
          service,
          account,
        });
      }
    } catch (error: any) {
      if (error.statusCode === 404 || error.code === 'SecretNotFound') {
        // Already deleted or doesn't exist
        return;
      }

      logger.error('Failed to delete credential from Azure Key Vault', {
        error: error.message,
        secretName,
      });
      throw new Error(`Azure Key Vault delete failed: ${error.message}`);
    }
  }

  /**
   * List all credentials (without values)
   */
  async list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]> {
    const credentials: Omit<Credential, 'value'>[] = [];

    try {
      const secretsIterator = this.client.listPropertiesOfSecrets();

      for await (const secretProperties of secretsIterator) {
        if (!secretProperties.name) continue;

        const parsed = this.parseSecretName(secretProperties.name);
        if (!parsed) continue;

        // Apply query filters
        if (query?.service && parsed.service !== query.service) continue;
        if (query?.account && parsed.account !== query.account) continue;

        // Extract tags
        const tags: string[] = [];
        if (secretProperties.tags) {
          Object.entries(secretProperties.tags).forEach(([key, value]) => {
            if (key.startsWith('tag-')) {
              tags.push(value);
            }
          });
        }

        // Apply tag filter
        if (query?.tags && query?.tags.length > 0) {
          const hasAllTags = query.tags.every((t) => tags.includes(t));
          if (!hasAllTags) continue;
        }

        credentials.push({
          id: secretProperties.id || secretProperties.name,
          service: parsed.service,
          account: parsed.account,
          metadata: {
            createdAt: secretProperties.createdOn || new Date(),
            updatedAt: secretProperties.updatedOn || new Date(),
            tags: tags.length > 0 ? tags : undefined,
          },
        });
      }

      logger.debug('Listed credentials from Azure Key Vault', {
        count: credentials.length,
        query,
      });

      return credentials;
    } catch (error: any) {
      logger.error('Failed to list credentials from Azure Key Vault', {
        error: error.message,
      });
      throw new Error(`Azure Key Vault list failed: ${error.message}`);
    }
  }

  /**
   * Check if Azure Key Vault is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try to list secrets with limit 1 as a health check
      const iterator = this.client.listPropertiesOfSecrets();
      await iterator.next();
      return true;
    } catch (error: any) {
      logger.warn('Azure Key Vault availability check failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Recover a soft-deleted secret
   */
  async recoverDeleted(service: string, account: string): Promise<void> {
    const secretName = this.getSecretName(service, account);

    try {
      const poller = await this.client.beginRecoverDeletedSecret(secretName);
      await poller.pollUntilDone();

      logger.info('Credential recovered from soft-delete', {
        secretName,
        service,
        account,
      });
    } catch (error: any) {
      logger.error('Failed to recover deleted credential', {
        error: error.message,
        secretName,
      });
      throw new Error(`Azure Key Vault recover failed: ${error.message}`);
    }
  }

  /**
   * Permanently purge a soft-deleted secret
   */
  async purgeDeleted(service: string, account: string): Promise<void> {
    const secretName = this.getSecretName(service, account);

    try {
      await this.client.purgeDeletedSecret(secretName);

      logger.info('Credential permanently purged', {
        secretName,
        service,
        account,
      });
    } catch (error: any) {
      logger.error('Failed to purge deleted credential', {
        error: error.message,
        secretName,
      });
      throw new Error(`Azure Key Vault purge failed: ${error.message}`);
    }
  }
}
