import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
const scryptAsync = promisify(scrypt);
const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
function getStorageDir() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
    return join(homeDir, '.smart-agents', 'credentials');
}
function getCredentialsFile() {
    return join(getStorageDir(), 'credentials.enc');
}
async function getMasterKey() {
    const identifier = process.platform + process.arch + (process.env.USER || process.env.USERNAME || 'default');
    const salt = Buffer.from('smart-agents-salt-v1');
    return (await scryptAsync(identifier, salt, KEY_LENGTH));
}
export class EncryptedFileStorage {
    storagePath;
    credentials = new Map();
    initialized = false;
    constructor() {
        this.storagePath = getCredentialsFile();
    }
    async initialize() {
        if (this.initialized)
            return;
        const storageDir = getStorageDir();
        if (!existsSync(storageDir)) {
            await mkdir(storageDir, { recursive: true, mode: 0o700 });
        }
        if (existsSync(this.storagePath)) {
            await this.load();
        }
        this.initialized = true;
    }
    async encrypt(plaintext) {
        const masterKey = await getMasterKey();
        const salt = randomBytes(SALT_LENGTH);
        const iv = randomBytes(IV_LENGTH);
        const key = (await scryptAsync(masterKey, salt, KEY_LENGTH));
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
    async decrypt(encryptedData) {
        const masterKey = await getMasterKey();
        const salt = Buffer.from(encryptedData.salt, 'hex');
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');
        const key = (await scryptAsync(masterKey, salt, KEY_LENGTH));
        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    async load() {
        try {
            const encryptedContent = await readFile(this.storagePath, 'utf8');
            const encryptedData = JSON.parse(encryptedContent);
            const decryptedContent = await this.decrypt(encryptedData);
            const data = JSON.parse(decryptedContent);
            this.credentials.clear();
            Object.entries(data.credentials).forEach(([key, credential]) => {
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
        }
        catch (error) {
            this.credentials.clear();
        }
    }
    async save() {
        const data = {
            version: 1,
            credentials: Object.fromEntries(this.credentials),
        };
        const plaintext = JSON.stringify(data, null, 2);
        const encryptedData = await this.encrypt(plaintext);
        const encryptedContent = JSON.stringify(encryptedData, null, 2);
        await writeFile(this.storagePath, encryptedContent, {
            mode: 0o600,
            encoding: 'utf8',
        });
    }
    getKey(service, account) {
        return `${service}:${account}`;
    }
    async set(credential) {
        await this.initialize();
        const key = this.getKey(credential.service, credential.account);
        const now = new Date();
        const metadata = {
            ...credential.metadata,
            createdAt: credential.metadata?.createdAt || now,
            updatedAt: now,
        };
        const fullCredential = {
            ...credential,
            id: credential.id || key,
            metadata,
        };
        this.credentials.set(key, fullCredential);
        await this.save();
    }
    async get(service, account) {
        await this.initialize();
        const key = this.getKey(service, account);
        return this.credentials.get(key) || null;
    }
    async delete(service, account) {
        await this.initialize();
        const key = this.getKey(service, account);
        if (!this.credentials.has(key)) {
            throw new Error(`Credential not found: ${service}/${account}`);
        }
        this.credentials.delete(key);
        await this.save();
    }
    async list(query) {
        await this.initialize();
        let results = Array.from(this.credentials.values());
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
                results = results.filter(c => c.metadata?.tags?.some(tag => query.tags.includes(tag)));
            }
        }
        return results.map(({ value, ...rest }) => rest);
    }
    async isAvailable() {
        try {
            const storageDir = getStorageDir();
            if (!existsSync(storageDir)) {
                await mkdir(storageDir, { recursive: true, mode: 0o700 });
            }
            await getMasterKey();
            return true;
        }
        catch {
            return false;
        }
    }
    getType() {
        return 'Encrypted File Storage';
    }
    async clear() {
        await this.initialize();
        this.credentials.clear();
        if (existsSync(this.storagePath)) {
            await rm(this.storagePath);
        }
    }
}
//# sourceMappingURL=EncryptedFileStorage.js.map