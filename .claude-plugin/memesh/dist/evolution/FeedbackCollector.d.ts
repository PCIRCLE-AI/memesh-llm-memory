import { AIMistake, AIErrorType } from './types.js';
export declare class FeedbackCollector {
    private mistakes;
    constructor();
    recordAIMistake(input: {
        action: string;
        errorType: AIErrorType;
        userCorrection: string;
        correctMethod: string;
        impact: string;
        preventionMethod: string;
        relatedRule?: string;
        context?: Record<string, unknown>;
    }): AIMistake;
    getMistakes(): AIMistake[];
    getMistakesByType(errorType: AIErrorType): AIMistake[];
    getRecentMistakes(count?: number): AIMistake[];
}
//# sourceMappingURL=FeedbackCollector.d.ts.map