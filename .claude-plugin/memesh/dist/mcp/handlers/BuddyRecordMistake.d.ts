import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { UnifiedMemoryStore } from '../../memory/UnifiedMemoryStore.js';
import { MistakePatternEngine } from '../../memory/MistakePatternEngine.js';
import { UserPreferenceEngine } from '../../memory/UserPreferenceEngine.js';
import { AIErrorType } from '../../evolution/types.js';
export interface BuddyRecordMistakeInput {
    action: string;
    errorType: AIErrorType;
    userCorrection: string;
    correctMethod: string;
    impact: string;
    preventionMethod: string;
    relatedRule?: string;
    context?: Record<string, unknown>;
}
export declare function handleBuddyRecordMistake(input: BuddyRecordMistakeInput, unifiedStore: UnifiedMemoryStore, _patternEngine: MistakePatternEngine, _preferenceEngine: UserPreferenceEngine): Promise<CallToolResult>;
//# sourceMappingURL=BuddyRecordMistake.d.ts.map