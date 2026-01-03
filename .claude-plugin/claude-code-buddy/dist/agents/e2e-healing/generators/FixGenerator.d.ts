import { AgentSDKAdapter } from '../sdk/AgentSDKAdapter.js';
export interface GenerateFixInput {
    rootCause: string;
    codeContext: string;
    testFile: string;
    componentFile?: string;
    styleFile?: string;
}
export interface GeneratedFix {
    code: string;
    targetFile: string;
    tokensUsed: number;
    cacheHit: boolean;
}
export declare class FixGenerator {
    private sdk?;
    setSDK(sdk: AgentSDKAdapter): void;
    generate(input: GenerateFixInput): Promise<GeneratedFix>;
    private determineTargetFile;
}
//# sourceMappingURL=FixGenerator.d.ts.map