export var MemoryScope;
(function (MemoryScope) {
    MemoryScope["GLOBAL"] = "global";
    MemoryScope["TECH_STACK"] = "tech";
    MemoryScope["PROJECT"] = "project";
    MemoryScope["DOMAIN"] = "domain";
    MemoryScope["SESSION"] = "session";
})(MemoryScope || (MemoryScope = {}));
export function requiresProjectName(scope) {
    return scope === MemoryScope.PROJECT || scope === MemoryScope.SESSION;
}
export function canHaveTechStack(scope) {
    return scope === MemoryScope.TECH_STACK || scope === MemoryScope.PROJECT || scope === MemoryScope.DOMAIN;
}
export function canHaveDomain(scope) {
    return scope === MemoryScope.DOMAIN || scope === MemoryScope.PROJECT;
}
export function getScopePriority(scope) {
    const priorities = {
        [MemoryScope.SESSION]: 5,
        [MemoryScope.DOMAIN]: 4,
        [MemoryScope.PROJECT]: 3,
        [MemoryScope.TECH_STACK]: 2,
        [MemoryScope.GLOBAL]: 1,
    };
    return priorities[scope];
}
export function compareScopePriority(scope1, scope2) {
    return getScopePriority(scope2) - getScopePriority(scope1);
}
export function getScopeDescription(scope) {
    const descriptions = {
        [MemoryScope.GLOBAL]: 'Universal principles applicable everywhere',
        [MemoryScope.TECH_STACK]: 'Knowledge specific to technology stacks',
        [MemoryScope.PROJECT]: 'Knowledge specific to a particular project',
        [MemoryScope.DOMAIN]: 'Knowledge specific to a business domain',
        [MemoryScope.SESSION]: 'Temporary memories for current session',
    };
    return descriptions[scope];
}
export function validateScopeMetadata(metadata) {
    const errors = [];
    if (!metadata.scope) {
        errors.push('scope is required');
        return { valid: false, errors };
    }
    if (metadata.scope === MemoryScope.TECH_STACK && (!metadata.techStack || metadata.techStack.length === 0)) {
        errors.push('techStack is recommended for TECH_STACK scope');
    }
    if (metadata.scope === MemoryScope.DOMAIN && !metadata.domain) {
        errors.push('domain is recommended for DOMAIN scope');
    }
    if (metadata.scope === MemoryScope.GLOBAL && metadata.techStack) {
        errors.push('techStack should not be set for GLOBAL scope');
    }
    if ((metadata.scope === MemoryScope.GLOBAL || metadata.scope === MemoryScope.TECH_STACK) && metadata.domain) {
        errors.push(`domain should not be set for ${metadata.scope} scope`);
    }
    return { valid: errors.length === 0, errors };
}
export function createScopeFilter(scope, options) {
    return {
        scope,
        ...options,
    };
}
//# sourceMappingURL=memory-scope.js.map