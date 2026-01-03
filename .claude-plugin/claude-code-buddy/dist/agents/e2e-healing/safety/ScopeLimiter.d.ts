import { HealingConstraints, CodeChange } from '../types.js';
interface ValidationResult {
    valid: boolean;
    violations: string[];
}
export declare class ScopeLimiter {
    private constraints;
    constructor(constraints: HealingConstraints);
    validateRepairScope(testFile: string, proposedFix: CodeChange[]): ValidationResult;
    private isForbidden;
    private isAllowed;
}
export {};
//# sourceMappingURL=ScopeLimiter.d.ts.map