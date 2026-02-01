/**
 * SecretManager
 *
 * Secure storage for API tokens, passwords, and other sensitive data.
 * Part of Phase 0.7.0 memory system upgrade.
 *
 * Features:
 * - AES-256-GCM encryption (never stores plaintext)
 * - Local-only storage (never transmitted)
 * - Auto-detection of secrets in content
 * - User confirmation before storing
 * - i18n support for all user-facing messages
 */

import Database from 'better-sqlite3';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { join } from 'path';
import { promises as fsPromises, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import type {
  DetectedSecret,
  StoredSecret,
  SecretStoreOptions,
  SecretConfirmationRequest,
  SecretType,
  SecretPattern,
} from './types/secret-types.js';
import { DEFAULT_SECRET_PATTERNS } from './types/secret-types.js';

/**
 * Encryption algorithm used for secrets
 */
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/**
 * IV length for AES-256-GCM (16 bytes)
 */
const IV_LENGTH = 16;

/**
 * Auth tag length for GCM (16 bytes)
 */
const AUTH_TAG_LENGTH = 16;

/**
 * Default expiration time in seconds (30 days)
 */
const DEFAULT_EXPIRATION_SECONDS = 30 * 24 * 60 * 60;

/**
 * SecretManager - Secure storage for sensitive data
 *
 * All secrets are encrypted with AES-256-GCM before storage.
 * The encryption key is derived from a machine-specific source.
 *
 * PRIVACY: Secrets are stored locally only and never transmitted.
 */
export class SecretManager {
  private db: Database.Database;
  private dbPath: string;
  private encryptionKey: Buffer;
  private secretPatterns: SecretPattern[];

  /**
   * Private constructor - use SecretManager.create() instead
   */
  private constructor(
    dbPath: string,
    db: Database.Database,
    encryptionKey: Buffer
  ) {
    this.dbPath = dbPath;
    this.db = db;
    this.encryptionKey = encryptionKey;
    this.secretPatterns = [...DEFAULT_SECRET_PATTERNS];
  }

  /**
   * Create a new SecretManager instance (async factory method)
   *
   * @param dbPath - Optional database path (defaults to ~/.claude-code-buddy/secrets.db)
   * @returns Promise<SecretManager> Initialized secret manager instance
   */
  static async create(dbPath?: string): Promise<SecretManager> {
    const defaultPath = join(homedir(), '.claude-code-buddy', 'secrets.db');
    const resolvedPath = dbPath || defaultPath;

    // Ensure .claude-code-buddy directory exists
    const dataDir = join(homedir(), '.claude-code-buddy');
    try {
      await fsPromises.access(dataDir);
    } catch {
      await fsPromises.mkdir(dataDir, { recursive: true });
    }

    // Open or create database
    const db = new Database(resolvedPath);

    // Get or create encryption key
    const encryptionKey = await SecretManager.getEncryptionKey(dataDir);

    // Create instance
    const instance = new SecretManager(resolvedPath, db, encryptionKey);

    // Initialize schema
    instance.initialize();

    logger.info(`[SecretManager] Initialized at: ${resolvedPath}`);

    return instance;
  }

  /**
   * Get or create the encryption key
   * Key is stored in a separate file for security
   */
  private static async getEncryptionKey(dataDir: string): Promise<Buffer> {
    const keyPath = join(dataDir, '.secret-key');

    try {
      const keyData = await fsPromises.readFile(keyPath);
      return keyData;
    } catch {
      // Generate new key
      const newKey = randomBytes(32); // 256 bits for AES-256
      await fsPromises.writeFile(keyPath, newKey, { mode: 0o600 });
      return newKey;
    }
  }

  /**
   * Initialize database schema
   */
  private initialize(): void {
    const schema = `
      CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        secret_type TEXT NOT NULL DEFAULT 'generic',
        encrypted_value TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT,
        metadata TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_secrets_name ON secrets(name);
      CREATE INDEX IF NOT EXISTS idx_secrets_type ON secrets(secret_type);
      CREATE INDEX IF NOT EXISTS idx_secrets_expires ON secrets(expires_at);
    `;

    this.db.exec(schema);
  }

  /**
   * Detect secrets in content using pattern matching
   *
   * @param content - Content to scan for secrets
   * @returns Array of detected secrets with positions and types
   */
  detectSecrets(content: string): DetectedSecret[] {
    const detectedSecrets: DetectedSecret[] = [];

    for (const pattern of this.secretPatterns) {
      // Reset lastIndex for global regex
      pattern.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.pattern.exec(content)) !== null) {
        detectedSecrets.push({
          type: pattern.type,
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: pattern.confidence,
        });
      }
    }

    // Remove duplicates based on position
    const uniqueSecrets = detectedSecrets.filter(
      (secret, index, self) =>
        index ===
        self.findIndex(
          (s) => s.startIndex === secret.startIndex && s.endIndex === secret.endIndex
        )
    );

    return uniqueSecrets.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Mask a sensitive value for display
   *
   * @param value - Value to mask
   * @returns Masked value (e.g., "sk-a****r678")
   */
  maskValue(value: string): string {
    if (!value || value.length === 0) {
      return '';
    }

    if (value.length <= 4) {
      return '*'.repeat(value.length);
    }

    if (value.length <= 8) {
      return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
    }

    // For longer values, show first 4 and last 4 characters
    return value.slice(0, 4) + '****' + value.slice(-4);
  }

  /**
   * Store a secret with encryption
   *
   * @param value - Secret value to store
   * @param options - Storage options (name, type, expiration)
   * @returns ID of the stored secret
   * @throws Error if name already exists
   */
  async store(value: string, options: SecretStoreOptions): Promise<string> {
    // Check for duplicate name
    const existing = this.db
      .prepare('SELECT id FROM secrets WHERE name = ?')
      .get(options.name);

    if (existing) {
      throw new Error(`Secret with name '${options.name}' already exists`);
    }

    // Generate ID
    const id = uuidv4();

    // Encrypt the value
    const { encryptedValue, iv, authTag } = this.encrypt(value);

    // Calculate expiration
    const now = new Date();
    const expiresInSeconds = options.expiresInSeconds ?? DEFAULT_EXPIRATION_SECONDS;
    const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);

    // Store in database
    const stmt = this.db.prepare(`
      INSERT INTO secrets (id, name, secret_type, encrypted_value, iv, auth_tag, created_at, updated_at, expires_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      options.name,
      options.secretType || 'generic',
      encryptedValue,
      iv,
      authTag,
      now.toISOString(),
      now.toISOString(),
      expiresAt.toISOString(),
      options.metadata ? JSON.stringify(options.metadata) : null
    );

    logger.info(`[SecretManager] Stored secret: ${options.name} (id: ${id})`);

    return id;
  }

  /**
   * Get a secret by ID
   *
   * @param id - Secret ID
   * @returns Decrypted value or null if not found/expired
   */
  async get(id: string): Promise<string | null> {
    const row = this.db
      .prepare('SELECT * FROM secrets WHERE id = ?')
      .get(id) as any;

    if (!row) {
      return null;
    }

    // Check expiration
    if (row.expires_at) {
      const expiresAt = new Date(row.expires_at);
      if (expiresAt < new Date()) {
        // Delete expired secret
        this.db.prepare('DELETE FROM secrets WHERE id = ?').run(id);
        return null;
      }
    }

    // Decrypt and return
    return this.decrypt(row.encrypted_value, row.iv, row.auth_tag);
  }

  /**
   * Get a secret by name
   *
   * @param name - Secret name
   * @returns Decrypted value or null if not found/expired
   */
  async getByName(name: string): Promise<string | null> {
    const row = this.db
      .prepare('SELECT * FROM secrets WHERE name = ?')
      .get(name) as any;

    if (!row) {
      return null;
    }

    return this.get(row.id);
  }

  /**
   * Get raw stored data (for testing/verification)
   * Does NOT return decrypted value
   *
   * @param id - Secret ID
   * @returns Stored secret data without decrypted value
   */
  getStoredData(id: string): StoredSecret | null {
    const row = this.db
      .prepare('SELECT * FROM secrets WHERE id = ?')
      .get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      secretType: row.secret_type as SecretType,
      encryptedValue: row.encrypted_value,
      iv: row.iv,
      authTag: row.auth_tag,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Update a secret's value
   *
   * @param id - Secret ID
   * @param newValue - New secret value
   * @returns true if updated, false if not found
   */
  async update(id: string, newValue: string): Promise<boolean> {
    const existing = this.db
      .prepare('SELECT id FROM secrets WHERE id = ?')
      .get(id);

    if (!existing) {
      return false;
    }

    // Encrypt new value
    const { encryptedValue, iv, authTag } = this.encrypt(newValue);

    // Update in database
    const stmt = this.db.prepare(`
      UPDATE secrets
      SET encrypted_value = ?, iv = ?, auth_tag = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(encryptedValue, iv, authTag, new Date().toISOString(), id);

    logger.info(`[SecretManager] Updated secret: ${id}`);

    return true;
  }

  /**
   * Update a secret's metadata
   *
   * @param id - Secret ID
   * @param metadata - New metadata
   * @returns true if updated, false if not found
   */
  async updateMetadata(
    id: string,
    metadata: Record<string, unknown>
  ): Promise<boolean> {
    const existing = this.db
      .prepare('SELECT id FROM secrets WHERE id = ?')
      .get(id);

    if (!existing) {
      return false;
    }

    const stmt = this.db.prepare(`
      UPDATE secrets
      SET metadata = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(metadata), new Date().toISOString(), id);

    return true;
  }

  /**
   * Delete a secret by ID
   *
   * @param id - Secret ID
   * @returns true if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    const result = this.db.prepare('DELETE FROM secrets WHERE id = ?').run(id);

    if (result.changes > 0) {
      logger.info(`[SecretManager] Deleted secret: ${id}`);
      return true;
    }

    return false;
  }

  /**
   * Delete a secret by name
   *
   * @param name - Secret name
   * @returns true if deleted, false if not found
   */
  async deleteByName(name: string): Promise<boolean> {
    const result = this.db
      .prepare('DELETE FROM secrets WHERE name = ?')
      .run(name);

    if (result.changes > 0) {
      logger.info(`[SecretManager] Deleted secret by name: ${name}`);
      return true;
    }

    return false;
  }

  /**
   * List all secrets (without values)
   *
   * @param filter - Optional filter by secret type
   * @returns Array of secret metadata (no values)
   */
  async list(filter?: { secretType?: SecretType }): Promise<
    Array<{
      id: string;
      name: string;
      secretType: SecretType;
      createdAt: Date;
      updatedAt: Date;
      expiresAt?: Date;
      metadata?: Record<string, unknown>;
    }>
  > {
    let sql = 'SELECT id, name, secret_type, created_at, updated_at, expires_at, metadata FROM secrets';
    const params: any[] = [];

    if (filter?.secretType) {
      sql += ' WHERE secret_type = ?';
      params.push(filter.secretType);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      secretType: row.secret_type as SecretType,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Generate a confirmation request for storing a secret
   * Returns i18n keys and parameters for user confirmation UI
   *
   * @param secretName - Name for the secret
   * @param value - Value to be stored (for masking)
   * @param expiresInSeconds - Expiration time in seconds
   * @returns Confirmation request with i18n keys
   */
  requestConfirmation(
    secretName: string,
    value: string,
    expiresInSeconds?: number
  ): SecretConfirmationRequest {
    const expSeconds = expiresInSeconds ?? DEFAULT_EXPIRATION_SECONDS;
    const expiresIn = this.formatExpiration(expSeconds);

    return {
      messageKey: 'ccb.secret.confirmation',
      params: {
        secretName,
        maskedValue: this.maskValue(value),
        expiresIn,
      },
      privacyNoticeKey: 'ccb.secret.privacyNotice',
    };
  }

  /**
   * Format expiration time for display
   */
  private formatExpiration(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    if (days > 0) {
      return days === 1 ? '1 day' : `${days} days`;
    }
    if (hours > 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    if (minutes > 0) {
      return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    }

    return `${seconds} seconds`;
  }

  /**
   * Encrypt a value using AES-256-GCM
   */
  private encrypt(value: string): {
    encryptedValue: string;
    iv: string;
    authTag: string;
  } {
    // Generate random IV
    const iv = randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);

    // Encrypt
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    return {
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt a value using AES-256-GCM
   */
  private decrypt(
    encryptedValue: string,
    iv: string,
    authTag: string
  ): string {
    // Convert from hex
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');

    // Create decipher
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      this.encryptionKey,
      ivBuffer
    );
    decipher.setAuthTag(authTagBuffer);

    // Decrypt
    let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Add custom secret patterns for detection
   *
   * @param patterns - Custom patterns to add
   */
  addSecretPatterns(patterns: SecretPattern[]): void {
    this.secretPatterns.push(...patterns);
  }

  /**
   * Clean up all expired secrets from the database
   *
   * This method should be called periodically (e.g., via cron job or at session start)
   * to remove secrets that have passed their expiration date.
   *
   * @returns Number of expired secrets that were deleted
   *
   * @example
   * ```typescript
   * // Clean up at session start
   * const cleaned = await secretManager.cleanupExpired();
   * console.log(`Cleaned up ${cleaned} expired secrets`);
   *
   * // Or set up periodic cleanup (e.g., every hour)
   * setInterval(() => secretManager.cleanupExpired(), 60 * 60 * 1000);
   * ```
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date().toISOString();

    const result = this.db
      .prepare('DELETE FROM secrets WHERE expires_at IS NOT NULL AND expires_at < ?')
      .run(now);

    if (result.changes > 0) {
      logger.info(`[SecretManager] Cleaned up ${result.changes} expired secrets`);
    }

    return result.changes;
  }

  /**
   * Get count of expired secrets (without deleting them)
   *
   * Useful for monitoring or deciding whether to run cleanup.
   *
   * @returns Number of currently expired secrets
   */
  async countExpired(): Promise<number> {
    const now = new Date().toISOString();

    const result = this.db
      .prepare('SELECT COUNT(*) as count FROM secrets WHERE expires_at IS NOT NULL AND expires_at < ?')
      .get(now) as { count: number };

    return result.count;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
    logger.info('[SecretManager] Database connection closed');
  }
}
