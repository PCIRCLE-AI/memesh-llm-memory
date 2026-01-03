import type { Credential, CredentialQuery, SecureStorage } from '../types.js';
export interface HashiCorpVaultConfig {
    address: string;
    token: string;
    mountPath?: string;
    useKVv2?: boolean;
    namespace?: string;
    timeout?: number;
    tls?: {
        ca?: string;
        skipVerify?: boolean;
    };
}
export declare class HashiCorpVault implements SecureStorage {
    private config;
    private baseUrl;
    constructor(config: HashiCorpVaultConfig);
    private getSecretPath;
    private vaultRequest;
    set(credential: Credential): Promise<void>;
    get(service: string, account: string): Promise<Credential | null>;
    delete(service: string, account: string): Promise<void>;
    list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]>;
    isAvailable(): Promise<boolean>;
    getType(): string;
    renewToken(increment?: number): Promise<void>;
    revokeToken(): Promise<void>;
}
//# sourceMappingURL=HashiCorpVault.d.ts.map