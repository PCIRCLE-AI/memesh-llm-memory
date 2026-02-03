import { MistakePatternEngine } from './MistakePatternEngine.js';
export interface Operation {
    tool: string;
    args: Record<string, unknown>;
    context: {
        recentTools: string[];
        currentTask: string;
        filesRead: string[];
        filesModified: string[];
    };
}
export interface HookResult {
    proceed: boolean | 'pending';
    reason?: string;
    warnings?: string[];
    suggestions?: string[];
    requireUserConfirmation?: boolean;
}
export declare class PreventionHook {
    private engine;
    constructor(engine: MistakePatternEngine);
    beforeToolCall(operation: Operation): Promise<HookResult>;
    getStatistics(): Promise<{
        totalRules: number;
        byCategory: Record<string, number>;
    }>;
}
//# sourceMappingURL=PreventionHook.d.ts.map