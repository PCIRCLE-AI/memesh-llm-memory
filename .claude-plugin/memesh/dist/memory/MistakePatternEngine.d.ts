import { UnifiedMemoryStore } from './UnifiedMemoryStore.js';
import type { PreventionRule } from './types/pattern-types.js';
export declare class MistakePatternEngine {
    private memoryStore;
    constructor(memoryStore: UnifiedMemoryStore);
    saveRule(rule: PreventionRule): Promise<void>;
    getAllRules(): Promise<PreventionRule[]>;
    getRuleById(ruleId: string): Promise<PreventionRule | null>;
    getStatistics(): Promise<{
        totalRules: number;
        byCategory: Record<string, number>;
    }>;
    private memoryToRule;
}
//# sourceMappingURL=MistakePatternEngine.d.ts.map