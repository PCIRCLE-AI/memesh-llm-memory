export declare enum MemoryScope {
    GLOBAL = "global",
    TECH_STACK = "tech",
    PROJECT = "project",
    DOMAIN = "domain",
    SESSION = "session"
}
export interface MemoryScopeMetadata {
    scope: MemoryScope;
    projectName?: string;
    domain?: string;
    techStack?: string[];
    category?: string[];
    sessionId?: string;
}
export declare function requiresProjectName(scope: MemoryScope): boolean;
export declare function canHaveTechStack(scope: MemoryScope): boolean;
export declare function canHaveDomain(scope: MemoryScope): boolean;
export declare function getScopePriority(scope: MemoryScope): number;
export declare function compareScopePriority(scope1: MemoryScope, scope2: MemoryScope): number;
export declare function getScopeDescription(scope: MemoryScope): string;
export declare function validateScopeMetadata(metadata: MemoryScopeMetadata): {
    valid: boolean;
    errors: string[];
};
export declare function createScopeFilter(scope: MemoryScope, options?: Partial<MemoryScopeMetadata>): MemoryScopeMetadata;
//# sourceMappingURL=memory-scope.d.ts.map