import { SecureStorage, Credential, CredentialQuery } from '../types.js';
export declare class EncryptedFileStorage implements SecureStorage {
    private storagePath;
    private credentials;
    private initialized;
    constructor();
    private initialize;
    private encrypt;
    private decrypt;
    private load;
    private save;
    private getKey;
    set(credential: Credential): Promise<void>;
    get(service: string, account: string): Promise<Credential | null>;
    delete(service: string, account: string): Promise<void>;
    list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]>;
    isAvailable(): Promise<boolean>;
    getType(): string;
    clear(): Promise<void>;
}
//# sourceMappingURL=EncryptedFileStorage.d.ts.map