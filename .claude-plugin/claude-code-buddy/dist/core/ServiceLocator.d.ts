export declare class ServiceLocator {
    private static services;
    static register<T>(key: string, service: T): void;
    static get<T>(key: string): T;
    static has(key: string): boolean;
    static clear(): void;
    static keys(): string[];
    static unregister(key: string): boolean;
}
//# sourceMappingURL=ServiceLocator.d.ts.map