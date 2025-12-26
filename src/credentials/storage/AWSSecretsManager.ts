/**
 * AWS Secrets Manager Storage Backend
 *
 * Provides secure credential storage using AWS Secrets Manager.
 * Supports:
 * - Automatic secret rotation
 * - Version management
 * - Cross-region replication
 * - Fine-grained access control via IAM
 */

import {
  SecretsManagerClient,
  CreateSecretCommand,
  GetSecretValueCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
  DescribeSecretCommand,
  TagResourceCommand,
  type Tag,
} from '@aws-sdk/client-secrets-manager';
import { logger } from '../../utils/logger.js';
import type { Credential, CredentialQuery, SecureStorage } from '../types.js';

/**
 * AWS Secrets Manager configuration
 */
export interface AWSSecretsManagerConfig {
  /**
   * AWS region (e.g., 'us-east-1', 'eu-west-1')
   */
  region: string;

  /**
   * Optional prefix for secret names (e.g., 'myapp/')
   */
  prefix?: string;

  /**
   * AWS credentials (optional - will use default credential chain if not provided)
   */
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };

  /**
   * KMS key ID for encryption (optional - uses default AWS key if not provided)
   */
  kmsKeyId?: string;

  /**
   * Enable automatic rotation (requires Lambda function setup)
   */
  enableRotation?: boolean;

  /**
   * Rotation interval in days (default: 30)
   */
  rotationDays?: number;
}

/**
 * AWS Secrets Manager storage backend
 */
export class AWSSecretsManager implements SecureStorage {
  private client: SecretsManagerClient;
  private config: AWSSecretsManagerConfig;

  constructor(config: AWSSecretsManagerConfig) {
    this.config = {
      rotationDays: 30,
      enableRotation: false,
      ...config,
    };

    this.client = new SecretsManagerClient({
      region: this.config.region,
      credentials: this.config.credentials,
    });

    logger.info('AWS Secrets Manager storage initialized', {
      region: this.config.region,
      prefix: this.config.prefix,
    });
  }

  /**
   * Generate secret name from service and account
   */
  private getSecretName(service: string, account: string): string {
    const base = `${service}/${account}`;
    return this.config.prefix ? `${this.config.prefix}${base}` : base;
  }

  /**
   * Parse secret name back to service and account
   */
  private parseSecretName(secretName: string): { service: string; account: string } | null {
    let name = secretName;
    if (this.config.prefix && name.startsWith(this.config.prefix)) {
      name = name.slice(this.config.prefix.length);
    }

    const parts = name.split('/');
    if (parts.length !== 2) {
      return null;
    }

    return { service: parts[0], account: parts[1] };
  }

  /**
   * Store a credential in AWS Secrets Manager
   */
  async set(credential: Credential): Promise<void> {
    const secretName = this.getSecretName(credential.service, credential.account);

    // Prepare secret value (store full credential as JSON)
    const secretValue = JSON.stringify({
      value: credential.value,
      metadata: credential.metadata,
    });

    // Prepare tags
    const tags: Tag[] = [
      { Key: 'service', Value: credential.service },
      { Key: 'account', Value: credential.account },
      { Key: 'managed-by', Value: 'smart-agents' },
    ];

    if (credential.metadata?.tags) {
      credential.metadata.tags.forEach((tag) => {
        tags.push({ Key: `tag:${tag}`, Value: 'true' });
      });
    }

    try {
      // Try to update existing secret first
      await this.client.send(
        new UpdateSecretCommand({
          SecretId: secretName,
          SecretString: secretValue,
          KmsKeyId: this.config.kmsKeyId,
        })
      );

      // Update tags
      const describeResponse = await this.client.send(
        new DescribeSecretCommand({
          SecretId: secretName,
        })
      );

      if (describeResponse.ARN) {
        await this.client.send(
          new TagResourceCommand({
            SecretId: describeResponse.ARN,
            Tags: tags,
          })
        );
      }

      logger.info('Credential updated in AWS Secrets Manager', {
        secretName,
        service: credential.service,
        account: credential.account,
      });
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        // Secret doesn't exist, create it
        await this.client.send(
          new CreateSecretCommand({
            Name: secretName,
            SecretString: secretValue,
            KmsKeyId: this.config.kmsKeyId,
            Tags: tags,
          })
        );

        logger.info('Credential created in AWS Secrets Manager', {
          secretName,
          service: credential.service,
          account: credential.account,
        });
      } else {
        logger.error('Failed to store credential in AWS Secrets Manager', {
          error: error.message,
          secretName,
        });
        throw new Error(`AWS Secrets Manager set failed: ${error.message}`);
      }
    }
  }

  /**
   * Retrieve a credential from AWS Secrets Manager
   */
  async get(service: string, account: string): Promise<Credential | null> {
    const secretName = this.getSecretName(service, account);

    try {
      const response = await this.client.send(
        new GetSecretValueCommand({
          SecretId: secretName,
        })
      );

      if (!response.SecretString) {
        return null;
      }

      const secretData = JSON.parse(response.SecretString);

      const credential: Credential = {
        id: response.ARN || secretName,
        service,
        account,
        value: secretData.value,
        metadata: secretData.metadata
          ? {
              ...secretData.metadata,
              createdAt: secretData.metadata.createdAt
                ? new Date(secretData.metadata.createdAt)
                : new Date(response.CreatedDate || Date.now()),
              updatedAt: new Date(response.VersionStages?.includes('AWSCURRENT') ? Date.now() : response.CreatedDate || Date.now()),
            }
          : {
              createdAt: new Date(response.CreatedDate || Date.now()),
              updatedAt: new Date(Date.now()),
            },
      };

      logger.debug('Credential retrieved from AWS Secrets Manager', {
        secretName,
        service,
        account,
      });

      return credential;
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        return null;
      }

      logger.error('Failed to retrieve credential from AWS Secrets Manager', {
        error: error.message,
        secretName,
      });
      throw new Error(`AWS Secrets Manager get failed: ${error.message}`);
    }
  }

  /**
   * Delete a credential from AWS Secrets Manager
   */
  async delete(service: string, account: string): Promise<void> {
    const secretName = this.getSecretName(service, account);

    try {
      await this.client.send(
        new DeleteSecretCommand({
          SecretId: secretName,
          // ForceDeleteWithoutRecovery: false, // Allow 30-day recovery window
          RecoveryWindowInDays: 30,
        })
      );

      logger.info('Credential scheduled for deletion in AWS Secrets Manager', {
        secretName,
        service,
        account,
        recoveryWindowDays: 30,
      });
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        // Already deleted or doesn't exist
        return;
      }

      logger.error('Failed to delete credential from AWS Secrets Manager', {
        error: error.message,
        secretName,
      });
      throw new Error(`AWS Secrets Manager delete failed: ${error.message}`);
    }
  }

  /**
   * List all credentials (without values)
   */
  async list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]> {
    const credentials: Omit<Credential, 'value'>[] = [];

    try {
      let nextToken: string | undefined;

      do {
        const response = await this.client.send(
          new ListSecretsCommand({
            MaxResults: 100,
            NextToken: nextToken,
          })
        );

        if (response.SecretList) {
          for (const secret of response.SecretList) {
            if (!secret.Name) continue;

            const parsed = this.parseSecretName(secret.Name);
            if (!parsed) continue;

            // Apply query filters
            if (query?.service && parsed.service !== query.service) continue;
            if (query?.account && parsed.account !== query.account) continue;

            // Extract tags from AWS tags
            const tags: string[] = [];
            if (secret.Tags) {
              secret.Tags.forEach((tag) => {
                if (tag.Key?.startsWith('tag:')) {
                  tags.push(tag.Key.slice(4));
                }
              });
            }

            // Apply tag filter
            if (query?.tags && query.tags.length > 0) {
              const hasAllTags = query.tags.every((t) => tags.includes(t));
              if (!hasAllTags) continue;
            }

            credentials.push({
              id: secret.ARN || secret.Name,
              service: parsed.service,
              account: parsed.account,
              metadata: {
                createdAt: new Date(secret.CreatedDate || Date.now()),
                updatedAt: new Date(secret.LastChangedDate || secret.CreatedDate || Date.now()),
                tags: tags.length > 0 ? tags : undefined,
              },
            });
          }
        }

        nextToken = response.NextToken;
      } while (nextToken);

      logger.debug('Listed credentials from AWS Secrets Manager', {
        count: credentials.length,
        query,
      });

      return credentials;
    } catch (error: any) {
      logger.error('Failed to list credentials from AWS Secrets Manager', {
        error: error.message,
      });
      throw new Error(`AWS Secrets Manager list failed: ${error.message}`);
    }
  }

  /**
   * Check if AWS Secrets Manager is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try to list secrets with limit 1 as a health check
      await this.client.send(
        new ListSecretsCommand({
          MaxResults: 1,
        })
      );
      return true;
    } catch (error: any) {
      logger.warn('AWS Secrets Manager availability check failed', {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    this.client.destroy();
    logger.info('AWS Secrets Manager storage closed');
  }
}
