import Anthropic from '@anthropic-ai/sdk';
interface AnalyzeFailureInput {
    error: Error;
    screenshot?: string;
    codeContext: string;
    useExtendedThinking?: boolean;
}
interface AnalyzeFailureResult {
    rootCause: string;
    tokensUsed: number;
}
interface GenerateFixInput {
    rootCause: string;
    codeContext: string;
    testFile: string;
}
interface GenerateFixResult {
    code: string;
    tokensUsed: number;
    cacheHit: boolean;
}
export declare class AgentSDKAdapter {
    private client;
    constructor(client: Anthropic);
    analyzeFailure(input: AnalyzeFailureInput): Promise<AnalyzeFailureResult>;
    generateFix(input: GenerateFixInput): Promise<GenerateFixResult>;
}
export {};
//# sourceMappingURL=AgentSDKAdapter.d.ts.map