import { MCPToolInterface } from '../core/MCPToolInterface.js';
export interface FunctionInfo {
    name: string;
    parameters: string[];
    returnType: string;
}
export interface TestCase {
    function: string;
    case: string;
    expected: string;
}
export interface CodeAnalysis {
    functions: FunctionInfo[];
    testCases: TestCase[];
}
export declare class TestWriterAgent {
    private mcp;
    constructor(mcp: MCPToolInterface);
    analyzeCode(sourceCode: string): CodeAnalysis;
    private extractFunctionInfo;
    private generateIntelligentTestCases;
    generateTests(filePath: string, sourceCode: string): Promise<string>;
    private generateTestBody;
    writeTestFile(sourcePath: string): Promise<void>;
}
//# sourceMappingURL=TestWriterAgent.d.ts.map