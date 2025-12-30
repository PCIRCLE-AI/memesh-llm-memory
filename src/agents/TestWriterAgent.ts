import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { generateTestFile } from './templates/test-templates.js';
import * as ts from 'typescript';

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

    // Use TypeScript AST parser for accurate code analysis
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    // Visit all nodes and extract functions
    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        const functionInfo = this.extractFunctionInfo(node, sourceFile);
        functions.push(functionInfo);

        // Generate intelligent test cases based on types
        testCases.push(...this.generateIntelligentTestCases(functionInfo));
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    return { functions, testCases };
  }

  private extractFunctionInfo(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): FunctionInfo {
    const name = node.name?.text || 'anonymous';
    const parameters = node.parameters.map(param => {
      const paramName = (param.name as ts.Identifier).text;
      const paramType = param.type ? param.type.getText(sourceFile) : 'any';
      return `${paramName}: ${paramType}`;
    });
    const returnType = node.type ? node.type.getText(sourceFile) : 'unknown';

    return { name, parameters, returnType };
  }

  private generateIntelligentTestCases(func: FunctionInfo): TestCase[] {
    const cases: TestCase[] = [];
    const typesFound = new Set<string>();

    // Always add normal case
    cases.push({
      function: func.name,
      case: 'normal-case',
      expected: 'return value'
    });

    // Add edge cases based on parameter types (avoid duplicates)
    for (const param of func.parameters) {
      if (param.includes('number') && !typesFound.has('number')) {
        typesFound.add('number');
        cases.push({
          function: func.name,
          case: 'edge-case-zero',
          expected: 'handle zero'
        });
        cases.push({
          function: func.name,
          case: 'edge-case-negative',
          expected: 'handle negative'
        });
      }
      if (param.includes('string') && !typesFound.has('string')) {
        typesFound.add('string');
        cases.push({
          function: func.name,
          case: 'edge-case-empty-string',
          expected: 'handle empty string'
        });
      }
      if ((param.includes('[]') || param.includes('Array')) && !typesFound.has('array')) {
        typesFound.add('array');
        cases.push({
          function: func.name,
          case: 'edge-case-empty-array',
          expected: 'handle empty array'
        });
      }
      if ((param.includes('null') || param.includes('undefined')) && !typesFound.has('nullable')) {
        typesFound.add('nullable');
        cases.push({
          function: func.name,
          case: 'edge-case-null-undefined',
          expected: 'handle null/undefined'
        });
      }
    }

    // Add error case if return type is never
    if (func.returnType === 'never') {
      cases.push({
        function: func.name,
        case: 'edge-case-throws',
        expected: 'throw error'
      });
    }

    return cases;
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
