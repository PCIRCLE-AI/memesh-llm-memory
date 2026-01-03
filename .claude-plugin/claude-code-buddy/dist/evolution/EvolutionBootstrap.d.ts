import type { LearnedPattern } from './types.js';
import type { LearningManager } from './LearningManager.js';
import type { AgentRegistry } from '../core/AgentRegistry.js';
import type { PerformanceTracker } from './PerformanceTracker.js';
export interface BootstrapPattern {
    id: string;
    type: 'success' | 'failure' | 'optimization' | 'anti-pattern';
    name: string;
    description: string;
    sequence: string[];
    confidence: number;
    observationCount: number;
    successCount: number;
    successRate: number;
    taskType: string;
    conditions: {
        taskComplexity?: 'low' | 'medium' | 'high';
        requiredCapabilities?: string[];
        context?: Record<string, any>;
    };
    action: {
        type: 'adjust_prompt' | 'change_model' | 'add_step' | 'remove_step' | 'modify_timeout';
        parameters: Record<string, any>;
    };
}
export interface BootstrapFile {
    version: string;
    description: string;
    patterns: BootstrapPattern[];
}
export interface PatternValidationError {
    patternId: string;
    field: string;
    message: string;
}
export declare class EvolutionBootstrap {
    private agentRegistry;
    private performanceTracker;
    private dataDir;
    private readonly BOOTSTRAP_FILE;
    private readonly MIN_TASKS_FOR_BOOTSTRAP;
    private readonly MAX_CONFIDENCE;
    private readonly MIN_CONFIDENCE;
    private readonly MIN_SEQUENCE_LENGTH;
    private readonly MAX_BOOTSTRAP_FILE_SIZE;
    private readonly CURRENT_BOOTSTRAP_VERSION;
    private readonly LARGE_SAMPLE_THRESHOLD;
    private readonly LARGE_SAMPLE_FP_TOLERANCE;
    constructor(agentRegistry: AgentRegistry, performanceTracker: PerformanceTracker, dataDir?: string, bootstrapFile?: string);
    private getBootstrapFilePath;
    private safeJsonParse;
    shouldBootstrap(): Promise<boolean>;
    loadBootstrapPatterns(): Promise<LearnedPattern[]>;
    private isValidAgentType;
    private isValidBootstrapFile;
    private isValidBootstrapPattern;
    private isCompatibleVersion;
    private validatePatterns;
    private convertToLearnedPatterns;
    importPatterns(learningManager: LearningManager): Promise<number>;
    getBootstrapStats(): Promise<{
        isNewUser: boolean;
        taskCount: number;
        availablePatterns: number;
        validPatterns: number;
        invalidPatterns: number;
    }>;
}
//# sourceMappingURL=EvolutionBootstrap.d.ts.map