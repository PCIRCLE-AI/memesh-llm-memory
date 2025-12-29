import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { generateTestFile } from './templates/test-templates.js';

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

export class TestWriterAgent {
  constructor(private mcp: MCPToolInterface) {}

  analyzeCode(sourceCode: string): CodeAnalysis {
    const functions: FunctionInfo[] = [];
    const testCases: TestCase[] = [];

    // Simple regex-based parsing (in production, use TypeScript AST parser)
    const functionRegex = /export\s+function\s+(\w+)\s*\(([^)]*)\)\s*:\s*(\w+)/g;
    let match;

    while ((match = functionRegex.exec(sourceCode)) !== null) {
      const [, name, params, returnType] = match;

      functions.push({
        name,
        parameters: params.split(',').map(p => p.trim()).filter(p => p),
        returnType
      });

      // Basic test case generation
      testCases.push({
        function: name,
        case: 'normal-case',
        expected: 'return value'
      });

      // Detect edge cases
      if (sourceCode.includes('throw') && sourceCode.includes(name)) {
        testCases.push({
          function: name,
          case: 'edge-case-zero-division',
          expected: 'throw error'
        });
      }
    }

    return { functions, testCases };
  }

  async generateTests(filePath: string, sourceCode: string): Promise<string> {
    const analysis = this.analyzeCode(sourceCode);
    const moduleName = filePath.split('/').pop()?.replace('.ts', '') || 'Unknown';
    const importPath = filePath.replace('src/', '../src/').replace('.ts', '');

    // Generate test cases for each function
    const functions = analysis.functions.map(func => {
      const funcTestCases = analysis.testCases
        .filter(tc => tc.function === func.name)
        .map(tc => ({
          description: `should ${tc.case.replace(/-/g, ' ')}`,
          body: this.generateTestBody(func, tc)
        }));

      return {
        name: func.name,
        testCases: funcTestCases
      };
    });

    return generateTestFile({
      moduleName,
      importPath,
      functions
    });
  }

  private generateTestBody(func: FunctionInfo, testCase: TestCase): string {
    if (testCase.case.includes('edge-case') && testCase.expected === 'throw error') {
      return `    expect(() => ${func.name}(10, 0)).toThrow();`;
    }

    // Generate basic test body
    const args = func.parameters.map((_, i) => `arg${i + 1}`).join(', ');
    return `    const result = ${func.name}(${args});\n    expect(result).toBeDefined();`;
  }

  async writeTestFile(sourcePath: string): Promise<void> {
    // Read source file
    const sourceCode = await this.mcp.filesystem.readFile(sourcePath);

    // Generate test code
    const testCode = await this.generateTests(sourcePath, sourceCode);

    // Write test file
    const testPath = sourcePath.replace('src/', 'tests/').replace('.ts', '.test.ts');
    await this.mcp.filesystem.writeFile({
      path: testPath,
      content: testCode
    });

    // Record to Knowledge Graph
    await this.mcp.memory.createEntities({
      entities: [{
        name: `${sourcePath} Test Coverage`,
        entityType: 'test_coverage',
        observations: [
          `Generated test file: ${testPath}`,
          `Source file: ${sourcePath}`,
          `Timestamp: ${new Date().toISOString()}`
        ]
      }]
    });
  }
}
