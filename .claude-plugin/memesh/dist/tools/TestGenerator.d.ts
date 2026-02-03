import { SamplingClient } from '../mcp/SamplingClient.js';
export declare class TestGenerator {
    private samplingClient;
    constructor(samplingClient: SamplingClient);
    generateTests(specification: string): Promise<string>;
    generateTestsFromCode(code: string): Promise<string>;
}
//# sourceMappingURL=TestGenerator.d.ts.map