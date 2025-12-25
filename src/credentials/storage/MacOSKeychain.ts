/**
 * macOS Keychain Secure Storage
 *
 * Uses the native macOS Keychain via the `security` command-line tool
 */

import { spawn } from 'child_process';
import { SecureStorage, Credential, CredentialQuery } from '../types.js';

const SERVICE_PREFIX = 'com.smart-agents';

/**
 * Execute security command safely without shell injection
 */
async function execSecurely(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('security', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `security command exited with code ${code}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

export class MacOSKeychain implements SecureStorage {
  async set(credential: Credential): Promise<void> {
    const serviceName = `${SERVICE_PREFIX}.${credential.service}`;

    try {
      // Try to delete existing credential first (ignore errors)
      await this.delete(credential.service, credential.account);
    } catch {
      // Ignore if doesn't exist
    }

    // Add new credential using secure execution
    const args = [
      'add-generic-password',
      '-s', serviceName,
      '-a', credential.account,
      '-w', credential.value,
      '-U',  // Update if exists
    ];

    try {
      await execSecurely(args);
    } catch (error) {
      throw new Error(
        `Failed to store credential in macOS Keychain: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Store metadata separately if present
    if (credential.metadata) {
      const metadataService = `${serviceName}.metadata`;
      const metadataValue = JSON.stringify(credential.metadata);

      const metadataArgs = [
        'add-generic-password',
        '-s', metadataService,
        '-a', credential.account,
        '-w', metadataValue,
        '-U',
      ];

      try {
        await execSecurely(metadataArgs);
      } catch {
        // Metadata storage is optional
      }
    }
  }

  async get(service: string, account: string): Promise<Credential | null> {
    const serviceName = `${SERVICE_PREFIX}.${service}`;

    // Get credential value using secure execution
    const args = [
      'find-generic-password',
      '-s', serviceName,
      '-a', account,
      '-w',  // Output password only
    ];

    try {
      const stdout = await execSecurely(args);
      const value = stdout.trim();

      // Get metadata if exists
      let metadata;
      try {
        const metadataService = `${serviceName}.metadata`;
        const metadataArgs = [
          'find-generic-password',
          '-s', metadataService,
          '-a', account,
          '-w',
        ];

        const metadataStdout = await execSecurely(metadataArgs);
        metadata = JSON.parse(metadataStdout.trim());

        // Convert date strings back to Date objects
        if (metadata.createdAt) metadata.createdAt = new Date(metadata.createdAt);
        if (metadata.updatedAt) metadata.updatedAt = new Date(metadata.updatedAt);
        if (metadata.expiresAt) metadata.expiresAt = new Date(metadata.expiresAt);
      } catch {
        // Metadata is optional
      }

      return {
        id: `${service}:${account}`,
        service,
        account,
        value,
        metadata,
      };
    } catch (error) {
      // Credential not found
      return null;
    }
  }

  async delete(service: string, account: string): Promise<void> {
    const serviceName = `${SERVICE_PREFIX}.${service}`;

    const args = [
      'delete-generic-password',
      '-s', serviceName,
      '-a', account,
    ];

    try {
      await execSecurely(args);

      // Try to delete metadata too
      try {
        const metadataService = `${serviceName}.metadata`;
        const metadataArgs = [
          'delete-generic-password',
          '-s', metadataService,
          '-a', account,
        ];

        await execSecurely(metadataArgs);
      } catch {
        // Ignore if metadata doesn't exist
      }
    } catch (error) {
      throw new Error(
        `Failed to delete credential from macOS Keychain: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]> {
    // Note: Listing credentials from Keychain is complex and not fully implemented
    // This is a placeholder that returns empty array
    // Full implementation would need to parse dump-keychain output
    // For now, credential listing is handled by CredentialVault's SQLite database
    return [];
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if security command is available
      await execSecurely(['help']);
      return true;
    } catch {
      return false;
    }
  }

  getType(): string {
    return 'macOS Keychain';
  }
}
