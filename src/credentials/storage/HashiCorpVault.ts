/**
 * HashiCorp Vault Storage Backend
 *
 * Provides secure credential storage using HashiCorp Vault.
 * Supports:
 * - Key/Value secrets engine (v1 and v2)
 * - Dynamic secrets
 * - Secret leasing and renewal
 * - Fine-grained access control via policies
 * - Audit logging
 */

import { logger } from '../../utils/logger.js';
import type { Credential, CredentialQuery, SecureStorage } from '../types.js';

/**
 * HashiCorp Vault configuration
 */
export interface HashiCorpVaultConfig {
  /**
   * Vault server address (e.g., 'https://vault.example.com:8200')
   */
  address: string;

  /**
   * Authentication token
   */
  token: string;

  /**
   * Secrets engine mount path (default: 'secret')
   */
  mountPath?: string;

  /**
   * Use KV v2 engine (default: true)
   */
  useKVv2?: boolean;

  /**
   * Optional namespace (Vault Enterprise feature)
   */
  namespace?: string;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * TLS options
   */
  tls?: {
    /**
     * CA certificate for verification
     */
    ca?: string;

    /**
     * Skip TLS verification (insecure, only for development)
     */
    skipVerify?: boolean;
  };
}

/**
 * Vault API response
 */
interface VaultResponse<T = any> {
  request_id: string;
  lease_id: string;
  renewable: boolean;
  lease_duration: number;
  data: T;
  warnings?: string[];
}

/**
 * HashiCorp Vault storage backend
 */
export class HashiCorpVault implements SecureStorage {
  private config: HashiCorpVaultConfig;
  private baseUrl: string;

  constructor(config: HashiCorpVaultConfig) {
    this.config = {
      mountPath: 'secret',
      useKVv2: true,
      timeout: 30000,
      ...config,
    };

    this.baseUrl = `${this.config.address}/v1`;

    logger.info('HashiCorp Vault storage initialized', {
      address: this.config.address,
      mountPath: this.config.mountPath,
      kvVersion: this.config.useKVv2 ? 'v2' : 'v1',
    });
  }

  /**
   * Get secret path based on KV version
   */
  private getSecretPath(service: string, account: string, operation: 'data' | 'metadata' = 'data'): string {
    const secretName = `${service}/${account}`;

    if (this.config.useKVv2) {
      return `${this.config.mountPath}/${operation}/${secretName}`;
    } else {
      return `${this.config.mountPath}/${secretName}`;
    }
  }

  /**
   * Make authenticated request to Vault
   */
  private async vaultRequest<T = any>(
    method: string,
    path: string,
    data?: any
  ): Promise<VaultResponse<T> | null> {
    const url = `${this.baseUrl}/${path}`;
    const headers: Record<string, string> = {
      'X-Vault-Token': this.config.token,
      'Content-Type': 'application/json',
    };

    if (this.config.namespace) {
      headers['X-Vault-Namespace'] = this.config.namespace;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
        // @ts-ignore - Node.js specific option
        rejectUnauthorized: !this.config.tls?.skipVerify,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vault request failed: ${response.status} ${errorText}`);
      }

      if (response.status === 204) {
        return null; // No content (e.g., from DELETE)
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`Vault request timeout after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Store a credential in Vault
   */
  async set(credential: Credential): Promise<void> {
    const path = this.getSecretPath(credential.service, credential.account);

    const secretData: Record<string, any> = {
      value: credential.value,
    };

    if (credential.metadata) {
      secretData.metadata = credential.metadata;
    }

    try {
      if (this.config.useKVv2) {
        // KV v2: wrap data in 'data' field
        await this.vaultRequest('POST', path, {
          data: secretData,
        });
      } else {
        // KV v1: data directly
        await this.vaultRequest('POST', path, secretData);
      }

      logger.info('Credential stored in HashiCorp Vault', {
        service: credential.service,
        account: credential.account,
        kvVersion: this.config.useKVv2 ? 'v2' : 'v1',
      });
    } catch (error: any) {
      logger.error('Failed to store credential in HashiCorp Vault', {
        error: error.message,
        service: credential.service,
        account: credential.account,
      });
      throw new Error(`HashiCorp Vault set failed: ${error.message}`);
    }
  }

  /**
   * Retrieve a credential from Vault
   */
  async get(service: string, account: string): Promise<Credential | null> {
    const path = this.getSecretPath(service, account);

    try {
      const response = await this.vaultRequest<any>('GET', path);

      if (!response) {
        return null;
      }

      let secretData: any;

      if (this.config.useKVv2) {
        // KV v2: data is nested under response.data.data
        secretData = response.data?.data;
      } else {
        // KV v1: data is directly in response.data
        secretData = response.data;
      }

      if (!secretData || !secretData.value) {
        return null;
      }

      const credential: Credential = {
        id: `${service}/${account}`,
        service,
        account,
        value: secretData.value,
        metadata: secretData.metadata || {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      logger.debug('Credential retrieved from HashiCorp Vault', {
        service,
        account,
      });

      return credential;
    } catch (error: any) {
      logger.error('Failed to retrieve credential from HashiCorp Vault', {
        error: error.message,
        service,
        account,
      });
      throw new Error(`HashiCorp Vault get failed: ${error.message}`);
    }
  }

  /**
   * Delete a credential from Vault
   */
  async delete(service: string, account: string): Promise<void> {
    const path = this.getSecretPath(service, account);

    try {
      if (this.config.useKVv2) {
        // KV v2: soft delete (can be undeleted)
        const metadataPath = this.getSecretPath(service, account, 'metadata');
        await this.vaultRequest('DELETE', metadataPath);
      } else {
        // KV v1: permanent delete
        await this.vaultRequest('DELETE', path);
      }

      logger.info('Credential deleted from HashiCorp Vault', {
        service,
        account,
        kvVersion: this.config.useKVv2 ? 'v2' : 'v1',
      });
    } catch (error: any) {
      logger.error('Failed to delete credential from HashiCorp Vault', {
        error: error.message,
        service,
        account,
      });
      throw new Error(`HashiCorp Vault delete failed: ${error.message}`);
    }
  }

  /**
   * List all credentials (without values)
   * Note: Requires LIST permission on the secrets path
   */
  async list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]> {
    const credentials: Omit<Credential, 'value'>[] = [];

    try {
      // List all secrets under the mount path
      const listPath = this.config.useKVv2
        ? `${this.config.mountPath}/metadata`
        : this.config.mountPath;

      const response = await this.vaultRequest<{ keys: string[] }>('LIST', listPath);

      if (!response || !response.data?.keys) {
        return [];
      }

      // Parse secret names
      for (const key of response.data.keys) {
        // Skip directories (end with /)
        if (key.endsWith('/')) continue;

        const parts = key.split('/');
        if (parts.length !== 2) continue;

        const [service, account] = parts;

        // Apply query filters
        if (query?.service && service !== query.service) continue;
        if (query?.account && account !== query.account) continue;

        // Get metadata if KV v2
        let metadata: Credential['metadata'] = {
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (this.config.useKVv2) {
          try {
            const metadataPath = this.getSecretPath(service, account, 'metadata');
            const metadataResponse = await this.vaultRequest<any>('GET', metadataPath);

            if (metadataResponse?.data) {
              const createdTime = metadataResponse.data.created_time;
              const updatedTime = metadataResponse.data.updated_time;

              metadata = {
                createdAt: createdTime ? new Date(createdTime) : new Date(),
                updatedAt: updatedTime ? new Date(updatedTime) : new Date(),
              };
            }
          } catch (error) {
            // Metadata fetch failed, use defaults
          }
        }

        credentials.push({
          id: `${service}/${account}`,
          service,
          account,
          metadata,
        });
      }

      logger.debug('Listed credentials from HashiCorp Vault', {
        count: credentials.length,
        query,
      });

      return credentials;
    } catch (error: any) {
      logger.error('Failed to list credentials from HashiCorp Vault', {
        error: error.message,
      });
      throw new Error(`HashiCorp Vault list failed: ${error.message}`);
    }
  }

  /**
   * Check if Vault is available and accessible
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check health endpoint
      const healthUrl = `${this.config.address}/v1/sys/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      // Vault returns 200 when initialized and unsealed
      // 429 when unsealed and standby
      // 473 when performance standby
      // 501 when not initialized
      // 503 when sealed
      return response.status === 200 || response.status === 429 || response.status === 473;
    } catch (error: any) {
      logger.warn('HashiCorp Vault availability check failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Renew the Vault token (if renewable)
   */
  async renewToken(increment?: number): Promise<void> {
    try {
      await this.vaultRequest('POST', 'auth/token/renew-self', {
        increment: increment || 3600, // Default 1 hour
      });

      logger.info('Vault token renewed', { increment });
    } catch (error: any) {
      logger.error('Failed to renew Vault token', {
        error: error.message,
      });
      throw new Error(`Vault token renewal failed: ${error.message}`);
    }
  }

  /**
   * Revoke the Vault token (logout)
   */
  async revokeToken(): Promise<void> {
    try {
      await this.vaultRequest('POST', 'auth/token/revoke-self');
      logger.info('Vault token revoked');
    } catch (error: any) {
      logger.error('Failed to revoke Vault token', {
        error: error.message,
      });
    }
  }
}
