export interface Credential {
    id: string;
    service: string;
    account: string;
    value: string;
    metadata?: {
        createdAt: Date;
        updatedAt: Date;
        expiresAt?: Date;
        notes?: string;
        tags?: string[];
    };
}
export interface CredentialInput {
    service: string;
    account: string;
    value: string;
    expiresAt?: Date;
    notes?: string;
    tags?: string[];
}
export interface CredentialQuery {
    service?: string;
    account?: string;
    id?: string;
    tags?: string[];
}
export interface SecureStorage {
    set(credential: Credential): Promise<void>;
    get(service: string, account: string): Promise<Credential | null>;
    delete(service: string, account: string): Promise<void>;
    list(query?: CredentialQuery): Promise<Omit<Credential, 'value'>[]>;
    isAvailable(): Promise<boolean>;
    getType(): string;
}
export type Platform = 'darwin' | 'win32' | 'linux';
export declare function getPlatform(): Platform;
export declare function isMacOS(): boolean;
export declare function isWindows(): boolean;
export declare function isLinux(): boolean;
//# sourceMappingURL=types.d.ts.map