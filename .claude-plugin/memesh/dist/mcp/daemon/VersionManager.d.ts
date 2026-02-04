export interface ParsedVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    build?: string;
}
export interface VersionInfo {
    version: string;
    major: number;
    minor: number;
    patch: number;
    protocolVersion: number;
    minCompatibleVersion: string;
}
export interface CompatibilityResult {
    compatible: boolean;
    reason?: string;
    upgradeRecommended: boolean;
}
export declare function parseVersion(version: string): ParsedVersion | null;
export declare function compareVersions(a: string, b: string): number;
export declare class VersionManager {
    private readonly version;
    private readonly parsed;
    private readonly protocolVersion;
    private readonly minCompatibleVersion;
    constructor(version: string, protocolVersion: number);
    getVersionInfo(): VersionInfo;
    isClientCompatible(clientVersion: string, clientProtocolVersion: number): CompatibilityResult;
    shouldUpgrade(clientVersion: string): boolean;
    static getMinCompatibleVersion(version: string): string;
    static isProtocolCompatible(a: number, b: number): boolean;
}
//# sourceMappingURL=VersionManager.d.ts.map