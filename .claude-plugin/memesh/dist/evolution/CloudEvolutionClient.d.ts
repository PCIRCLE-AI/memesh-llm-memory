import type { AIMistake, AIBehaviorPattern, AIErrorType } from './types.js';
import type { Message, CorrectionDetection } from './LocalMistakeDetector.js';
export interface CloudEvolutionConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
}
export interface AdvancedMistakeDetection extends CorrectionDetection {
    errorType?: AIErrorType;
    impact?: string;
    preventionMethod?: string;
    relatedRule?: string;
}
export interface PatternRecognitionResult {
    patterns: AIBehaviorPattern[];
    confidence: number;
    insights: string[];
}
export interface PreventionSuggestion {
    suggestion: string;
    confidence: number;
    patternId?: string;
}
export declare class CloudEvolutionClient {
    private _config;
    constructor(config: CloudEvolutionConfig);
    detectCorrectionAdvanced(_userMessage: string, _conversation: Message[]): Promise<AdvancedMistakeDetection>;
    recognizePatterns(_mistakes: AIMistake[]): Promise<PatternRecognitionResult>;
    getPreventionSuggestions(_context: Record<string, unknown>): Promise<PreventionSuggestion[]>;
    getGlobalPatterns(): Promise<AIBehaviorPattern[]>;
    syncMistakes(_mistakes: AIMistake[]): Promise<void>;
    checkHealth(): Promise<{
        available: boolean;
        authenticated: boolean;
        tier: 'free' | 'pro' | 'team' | 'enterprise';
    }>;
}
export declare function createCloudClient(apiKey?: string): CloudEvolutionClient | null;
//# sourceMappingURL=CloudEvolutionClient.d.ts.map