import { SecureStorage, Credential, CredentialQuery } from '../types.js';
export declare class LinuxSecretService implements SecureStorage {
    private toolType;
    set(credential: Credential): Promise<void>;
    get(service: string, account: string): Promise<Credential | null>;
    delete(service: string, account: string): Promise<void>;
    list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]>;
    isAvailable(): Promise<boolean>;
    getType(): string;
    private ensureToolAvailable;
    private escapeString;
}
//# sourceMappingURL=LinuxSecretService.d.ts.map