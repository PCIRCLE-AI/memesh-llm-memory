import { SamplingClient } from '../SamplingClient.js';
export interface GenerateTestsInput {
    specification?: string;
    code?: string;
}
export interface GenerateTestsOutput {
    testCode: string;
    message: string;
}
export declare function generateTestsTool(input: GenerateTestsInput, samplingClient: SamplingClient): Promise<GenerateTestsOutput>;
//# sourceMappingURL=generate-tests.d.ts.map