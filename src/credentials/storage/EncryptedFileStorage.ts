/**
 * Encrypted File Storage
 *
 * Fallback secure storage using AES-256-GCM encryption
 * Used when platform-specific storage is not available
 */

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { SecureStorage, Credential, CredentialQuery } from '../types.js';

const scryptAsync = promisify(scrypt);

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get storage directory path
 */
function getStorageDir(): string {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  return join(homeDir, '.smart-agents', 'credentials');
}

/**
 * Get credentials file path
 */
function getCredentialsFile(): string {
  return join(getStorageDir(), 'credentials.enc');
}

/**
 * Get master key from environment or system
 */
async function getMasterKey(): Promise<Buffer> {
  // In production, this should use a more secure key derivation
  // For now, use a system-specific identifier
  const identifier = process.platform + process.arch + (process.env.USER || process.env.USERNAME || 'default');
  const salt = Buffer.from('smart-agents-salt-v1'); // Fixed salt for consistency

  return (await scryptAsync(identifier, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypted credential data structure
 */
interface EncryptedData {
  salt: string;
  iv: string;
  authTag: string;
  encrypted: string;
}

/**
 * Stored credentials structure
 */
interface StoredCredentials {
  version: number;
  credentials: Record<string, Credential>;
}

export class EncryptedFileStorage implements SecureStorage {
  private storagePath: string;
  private credentials: Map<string, Credential> = new Map();
  private initialized = false;

  constructor() {
    this.storagePath = getCredentialsFile();
  }

  /**
   * Ensure storage directory exists and load credentials
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    const storageDir = getStorageDir();

    // Create storage directory if it doesn't exist
    if (!existsSync(storageDir)) {
      await mkdir(storageDir, { recursive: true, mode: 0o700 });
    }

    // Load existing credentials if file exists
    if (existsSync(this.storagePath)) {
      await this.load();
    }

    this.initialized = true;
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private async encrypt(plaintext: string): Promise<EncryptedData> {
    const masterKey = await getMasterKey();
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // Derive encryption key from master key and salt
    const key = (await scryptAsync(masterKey, salt, KEY_LENGTH)) as Buffer;

    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted,
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private async decrypt(encryptedData: EncryptedData): Promise<string> {
    const masterKey = await getMasterKey();
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    // Derive decryption key from master key and salt
    const key = (await scryptAsync(masterKey, salt, KEY_LENGTH)) as Buffer;

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Load credentials from encrypted file
   */
  private async load(): Promise<void> {
    try {
      const encryptedContent = await readFile(this.storagePath, 'utf8');
      const encryptedData: EncryptedData = JSON.parse(encryptedContent);

      const decryptedContent = await this.decrypt(encryptedData);
      const data: StoredCredentials = JSON.parse(decryptedContent);

      this.credentials.clear();

      // Restore credentials from stored format
      Object.entries(data.credentials).forEach(([key, credential]) => {
        // Convert date strings back to Date objects
        if (credential.metadata) {
          if (credential.metadata.createdAt) {
            credential.metadata.createdAt = new Date(credential.metadata.createdAt);
          }
          if (credential.metadata.updatedAt) {
            credential.metadata.updatedAt = new Date(credential.metadata.updatedAt);
          }
          if (credential.metadata.expiresAt) {
            credential.metadata.expiresAt = new Date(credential.metadata.expiresAt);
          }
        }

        this.credentials.set(key, credential);
      });
    } catch (error) {
      // If file doesn't exist or can't be decrypted, start fresh
      this.credentials.clear();
    }
  }

  /**
   * Save credentials to encrypted file
   */
  private async save(): Promise<void> {
    const data: StoredCredentials = {
      version: 1,
      credentials: Object.fromEntries(this.credentials),
    };

    const plaintext = JSON.stringify(data, null, 2);
    const encryptedData = await this.encrypt(plaintext);

    const encryptedContent = JSON.stringify(encryptedData, null, 2);

    // Write with restricted permissions
    await writeFile(this.storagePath, encryptedContent, {
      mode: 0o600,
      encoding: 'utf8',
    });
  }

  /**
   * Generate storage key from service and account
   */
  private getKey(service: string, account: string): string {
    return `${service}:${account}`;
  }

  async set(credential: Credential): Promise<void> {
    await this.initialize();

    const key = this.getKey(credential.service, credential.account);

    // Add timestamps to metadata
    const now = new Date();
    const metadata = {
      ...credential.metadata,
      createdAt: credential.metadata?.createdAt || now,
      updatedAt: now,
    };

    const fullCredential: Credential = {
      ...credential,
      id: credential.id || key,
      metadata,
    };

    this.credentials.set(key, fullCredential);
    await this.save();
  }

  async get(service: string, account: string): Promise<Credential | null> {
    await this.initialize();

    const key = this.getKey(service, account);
    return this.credentials.get(key) || null;
  }

  async delete(service: string, account: string): Promise<void> {
    await this.initialize();

    const key = this.getKey(service, account);

    if (!this.credentials.has(key)) {
      throw new Error(`Credential not found: ${service}/${account}`);
    }

    this.credentials.delete(key);
    await this.save();
  }

  async list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]> {
    await this.initialize();

    let results = Array.from(this.credentials.values());

    // Apply filters
    if (query) {
      if (query.service) {
        results = results.filter(c => c.service === query.service);
      }
      if (query.account) {
        results = results.filter(c => c.account === query.account);
      }
      if (query.id) {
        results = results.filter(c => c.id === query.id);
      }
      if (query.tags && query.tags.length > 0) {
        results = results.filter(c =>
          c.metadata?.tags?.some(tag => query.tags!.includes(tag))
        );
      }
    }

    // Remove value field
    return results.map(({ value, ...rest }) => rest);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if we can create the storage directory
      const storageDir = getStorageDir();

      if (!existsSync(storageDir)) {
        await mkdir(storageDir, { recursive: true, mode: 0o700 });
      }

      // Verify we can derive the master key
      await getMasterKey();

      return true;
    } catch {
      return false;
    }
  }

  getType(): string {
    return 'Encrypted File Storage';
  }

  /**
   * Clear all credentials (for testing/reset)
   */
  async clear(): Promise<void> {
    await this.initialize();

    this.credentials.clear();

    if (existsSync(this.storagePath)) {
      await rm(this.storagePath);
    }
  }
}
