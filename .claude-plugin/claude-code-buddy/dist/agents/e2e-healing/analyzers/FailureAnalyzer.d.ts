import { AgentSDKAdapter } from '../sdk/AgentSDKAdapter.js';
interface Evidence {
    testFile: string;
    testCode: string;
    error?: Error;
    screenshot?: string;
    logs?: string[];
    relatedFiles: string[];
}
interface Analysis {
    rootCause: string;
    confidence: number;
    tokensUsed: number;
}
export declare class FailureAnalyzer {
    private sdk?;
    setSDK(sdk: AgentSDKAdapter): void;
    analyze(evidence: Evidence): Promise<Analysis>;
    private calculateConfidence;
}
export {};
//# sourceMappingURL=FailureAnalyzer.d.ts.map