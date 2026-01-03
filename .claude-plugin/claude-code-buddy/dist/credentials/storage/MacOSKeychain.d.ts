import { SecureStorage, Credential, CredentialQuery } from '../types.js';
export declare class MacOSKeychain implements SecureStorage {
    set(credential: Credential): Promise<void>;
    get(service: string, account: string): Promise<Credential | null>;
    delete(service: string, account: string): Promise<void>;
    list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]>;
    isAvailable(): Promise<boolean>;
    getType(): string;
}
//# sourceMappingURL=MacOSKeychain.d.ts.map