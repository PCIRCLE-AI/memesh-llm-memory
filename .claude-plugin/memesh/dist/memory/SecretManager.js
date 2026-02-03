import Database from 'better-sqlite3';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { join } from 'path';
import { promises as fsPromises } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDataPath, getDataDirectory } from '../utils/PathResolver.js';
import { logger } from '../utils/logger.js';
import { DEFAULT_SECRET_PATTERNS } from './types/secret-types.js';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const DEFAULT_EXPIRATION_SECONDS = 30 * 24 * 60 * 60;
export class SecretManager {
    db;
    dbPath;
    encryptionKey;
    secretPatterns;
    constructor(dbPath, db, encryptionKey) {
        this.dbPath = dbPath;
        this.db = db;
        this.encryptionKey = encryptionKey;
        this.secretPatterns = [...DEFAULT_SECRET_PATTERNS];
    }
    static async create(dbPath) {
        const defaultPath = getDataPath('secrets.db');
        const resolvedPath = dbPath || defaultPath;
        const dataDir = getDataDirectory();
        try {
            await fsPromises.access(dataDir);
        }
        catch {
            await fsPromises.mkdir(dataDir, { recursive: true });
        }
        const db = new Database(resolvedPath);
        const encryptionKey = await SecretManager.getEncryptionKey(dataDir);
        const instance = new SecretManager(resolvedPath, db, encryptionKey);
        instance.initialize();
        logger.info(`[SecretManager] Initialized at: ${resolvedPath}`);
        return instance;
    }
    static async getEncryptionKey(dataDir) {
        const keyPath = join(dataDir, '.secret-key');
        try {
            const keyData = await fsPromises.readFile(keyPath);
            return keyData;
        }
        catch {
            const newKey = randomBytes(32);
            await fsPromises.writeFile(keyPath, newKey, { mode: 0o600 });
            return newKey;
        }
    }
    initialize() {
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
    detectSecrets(content) {
        const detectedSecrets = [];
        for (const pattern of this.secretPatterns) {
            pattern.pattern.lastIndex = 0;
            let match;
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
        const uniqueSecrets = detectedSecrets.filter((secret, index, self) => index ===
            self.findIndex((s) => s.startIndex === secret.startIndex && s.endIndex === secret.endIndex));
        return uniqueSecrets.sort((a, b) => a.startIndex - b.startIndex);
    }
    maskValue(value) {
        if (!value || value.length === 0) {
            return '';
        }
        if (value.length <= 4) {
            return '*'.repeat(value.length);
        }
        if (value.length <= 8) {
            return value[0] + '*'.repeat(value.length - 2) + value[value.length - 1];
        }
        return value.slice(0, 4) + '****' + value.slice(-4);
    }
    async store(value, options) {
        const existing = this.db
            .prepare('SELECT id FROM secrets WHERE name = ?')
            .get(options.name);
        if (existing) {
            throw new Error(`Secret with name '${options.name}' already exists`);
        }
        const id = uuidv4();
        const { encryptedValue, iv, authTag } = this.encrypt(value);
        const now = new Date();
        const expiresInSeconds = options.expiresInSeconds ?? DEFAULT_EXPIRATION_SECONDS;
        const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);
        const stmt = this.db.prepare(`
      INSERT INTO secrets (id, name, secret_type, encrypted_value, iv, auth_tag, created_at, updated_at, expires_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, options.name, options.secretType || 'generic', encryptedValue, iv, authTag, now.toISOString(), now.toISOString(), expiresAt.toISOString(), options.metadata ? JSON.stringify(options.metadata) : null);
        logger.info(`[SecretManager] Stored secret: ${options.name} (id: ${id})`);
        return id;
    }
    async get(id) {
        const row = this.db
            .prepare('SELECT * FROM secrets WHERE id = ?')
            .get(id);
        if (!row) {
            return null;
        }
        if (row.expires_at) {
            const expiresAt = new Date(row.expires_at);
            if (expiresAt < new Date()) {
                this.db.prepare('DELETE FROM secrets WHERE id = ?').run(id);
                return null;
            }
        }
        return this.decrypt(row.encrypted_value, row.iv, row.auth_tag);
    }
    async getByName(name) {
        const row = this.db
            .prepare('SELECT * FROM secrets WHERE name = ?')
            .get(name);
        if (!row) {
            return null;
        }
        return this.get(row.id);
    }
    getStoredData(id) {
        const row = this.db
            .prepare('SELECT * FROM secrets WHERE id = ?')
            .get(id);
        if (!row) {
            return null;
        }
        return {
            id: row.id,
            name: row.name,
            secretType: row.secret_type,
            encryptedValue: row.encrypted_value,
            iv: row.iv,
            authTag: row.auth_tag,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        };
    }
    async update(id, newValue) {
        const existing = this.db
            .prepare('SELECT id FROM secrets WHERE id = ?')
            .get(id);
        if (!existing) {
            return false;
        }
        const { encryptedValue, iv, authTag } = this.encrypt(newValue);
        const stmt = this.db.prepare(`
      UPDATE secrets
      SET encrypted_value = ?, iv = ?, auth_tag = ?, updated_at = ?
      WHERE id = ?
    `);
        stmt.run(encryptedValue, iv, authTag, new Date().toISOString(), id);
        logger.info(`[SecretManager] Updated secret: ${id}`);
        return true;
    }
    async updateMetadata(id, metadata) {
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
    async delete(id) {
        const result = this.db.prepare('DELETE FROM secrets WHERE id = ?').run(id);
        if (result.changes > 0) {
            logger.info(`[SecretManager] Deleted secret: ${id}`);
            return true;
        }
        return false;
    }
    async deleteByName(name) {
        const result = this.db
            .prepare('DELETE FROM secrets WHERE name = ?')
            .run(name);
        if (result.changes > 0) {
            logger.info(`[SecretManager] Deleted secret by name: ${name}`);
            return true;
        }
        return false;
    }
    async list(filter) {
        let sql = 'SELECT id, name, secret_type, created_at, updated_at, expires_at, metadata FROM secrets';
        const params = [];
        if (filter?.secretType) {
            sql += ' WHERE secret_type = ?';
            params.push(filter.secretType);
        }
        sql += ' ORDER BY created_at DESC';
        const rows = this.db.prepare(sql).all(...params);
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            secretType: row.secret_type,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        }));
    }
    requestConfirmation(secretName, value, expiresInSeconds) {
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
    formatExpiration(seconds) {
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
    encrypt(value) {
        const iv = randomBytes(IV_LENGTH);
        const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
        let encrypted = cipher.update(value, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            encryptedValue: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
        };
    }
    decrypt(encryptedValue, iv, authTag) {
        const ivBuffer = Buffer.from(iv, 'hex');
        const authTagBuffer = Buffer.from(authTag, 'hex');
        const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, ivBuffer);
        decipher.setAuthTag(authTagBuffer);
        let decrypted = decipher.update(encryptedValue, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    addSecretPatterns(patterns) {
        this.secretPatterns.push(...patterns);
    }
    async cleanupExpired() {
        const now = new Date().toISOString();
        const result = this.db
            .prepare('DELETE FROM secrets WHERE expires_at IS NOT NULL AND expires_at < ?')
            .run(now);
        if (result.changes > 0) {
            logger.info(`[SecretManager] Cleaned up ${result.changes} expired secrets`);
        }
        return result.changes;
    }
    async countExpired() {
        const now = new Date().toISOString();
        const result = this.db
            .prepare('SELECT COUNT(*) as count FROM secrets WHERE expires_at IS NOT NULL AND expires_at < ?')
            .get(now);
        return result.count;
    }
    close() {
        this.db.close();
        logger.info('[SecretManager] Database connection closed');
    }
}
//# sourceMappingURL=SecretManager.js.map