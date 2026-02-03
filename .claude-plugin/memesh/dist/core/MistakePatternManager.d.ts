import type { UnifiedMemoryStore } from '../memory/UnifiedMemoryStore.js';
export interface MistakePattern {
    id: string;
    category: string;
    description: string;
    baseImportance: number;
    occurrenceCount: number;
    occurrences: Date[];
    weight: number;
    relatedPhases: string[];
    prevention: string;
}
export interface PatternConfig {
    decayRate?: number;
    minImportance?: number;
    maxAgeDays?: number;
    minOccurrences?: number;
}
export declare class MistakePatternManager {
    private memoryStore;
    private config;
    constructor(memoryStore: UnifiedMemoryStore, config?: PatternConfig);
    extractPatterns(phase?: string): Promise<MistakePattern[]>;
    private isRelevantToPhase;
    private groupBySimilarity;
    private generateSignature;
    private createPattern;
    private calculateWeight;
    getTopPatterns(phase?: string, limit?: number): Promise<MistakePattern[]>;
}
//# sourceMappingURL=MistakePatternManager.d.ts.map