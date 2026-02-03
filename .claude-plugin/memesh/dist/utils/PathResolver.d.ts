export declare function getDataDirectory(): string;
export declare function getDataPath(filename: string): string;
export declare function isMigrationNeeded(): boolean;
export declare function getMigrationInfo(): {
    newDir: string;
    legacyDir: string;
    newDirExists: boolean;
    legacyDirExists: boolean;
    migrationNeeded: boolean;
    currentlyUsing: string;
};
export declare function _clearCache(): void;
//# sourceMappingURL=PathResolver.d.ts.map