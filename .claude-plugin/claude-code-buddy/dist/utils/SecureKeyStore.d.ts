export declare class SecureKeyStore {
    private static keys;
    static set(provider: string, key: string): void;
    static get(provider: string): string | undefined;
    static has(provider: string): boolean;
    static delete(provider: string): void;
    static clear(): void;
    static listProviders(): string[];
}
//# sourceMappingURL=SecureKeyStore.d.ts.map