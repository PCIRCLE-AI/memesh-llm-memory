export interface CorrectionDetection {
    isCorrection: boolean;
    confidence: number;
    language?: string;
    wrongAction?: string;
    correctMethod?: string;
}
export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}
export declare class LocalMistakeDetector {
    detectCorrection(userMessage: string, language?: string): CorrectionDetection;
    detectCorrectionWithContext(userMessage: string, conversationContext: Message[]): CorrectionDetection;
    private extractCorrectionContent;
    private isImmediateFollowUp;
    detectNegativeSentiment(message: string): boolean;
}
//# sourceMappingURL=LocalMistakeDetector.d.ts.map