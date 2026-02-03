import type { DetectedSecret, StoredSecret, SecretStoreOptions, SecretConfirmationRequest, SecretType, SecretPattern } from './types/secret-types.js';
export declare class SecretManager {
    private db;
    private dbPath;
    private encryptionKey;
    private secretPatterns;
    private constructor();
    static create(dbPath?: string): Promise<SecretManager>;
    private static getEncryptionKey;
    private initialize;
    detectSecrets(content: string): DetectedSecret[];
    maskValue(value: string): string;
    store(value: string, options: SecretStoreOptions): Promise<string>;
    get(id: string): Promise<string | null>;
    getByName(name: string): Promise<string | null>;
    getStoredData(id: string): StoredSecret | null;
    update(id: string, newValue: string): Promise<boolean>;
    updateMetadata(id: string, metadata: Record<string, unknown>): Promise<boolean>;
    delete(id: string): Promise<boolean>;
    deleteByName(name: string): Promise<boolean>;
    list(filter?: {
        secretType?: SecretType;
    }): Promise<Array<{
        id: string;
        name: string;
        secretType: SecretType;
        createdAt: Date;
        updatedAt: Date;
        expiresAt?: Date;
        metadata?: Record<string, unknown>;
    }>>;
    requestConfirmation(secretName: string, value: string, expiresInSeconds?: number): SecretConfirmationRequest;
    private formatExpiration;
    private encrypt;
    private decrypt;
    addSecretPatterns(patterns: SecretPattern[]): void;
    cleanupExpired(): Promise<number>;
    countExpired(): Promise<number>;
    close(): void;
}
//# sourceMappingURL=SecretManager.d.ts.map