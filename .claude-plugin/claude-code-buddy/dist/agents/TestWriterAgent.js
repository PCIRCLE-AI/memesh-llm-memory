import { generateTestFile } from './templates/test-templates.js';
import * as ts from 'typescript';
export class TestWriterAgent {
    mcp;
    constructor(mcp) {
        this.mcp = mcp;
    }
    analyzeCode(sourceCode) {
        const functions = [];
        const testCases = [];
        const sourceFile = ts.createSourceFile('temp.ts', sourceCode, ts.ScriptTarget.Latest, true);
        const visit = (node) => {
            if (ts.isFunctionDeclaration(node) && node.name) {
                const functionInfo = this.extractFunctionInfo(node, sourceFile);
                functions.push(functionInfo);
                testCases.push(...this.generateIntelligentTestCases(functionInfo));
            }
            ts.forEachChild(node, visit);
        };
        visit(sourceFile);
        return { functions, testCases };
    }
    extractFunctionInfo(node, sourceFile) {
        const name = node.name?.text || 'anonymous';
        const parameters = node.parameters.map(param => {
            const paramName = param.name.text;
            const paramType = param.type ? param.type.getText(sourceFile) : 'any';
            return `${paramName}: ${paramType}`;
        });
        const returnType = node.type ? node.type.getText(sourceFile) : 'unknown';
        return { name, parameters, returnType };
    }
    generateIntelligentTestCases(func) {
        const cases = [];
        const typesFound = new Set();
        cases.push({
            function: func.name,
            case: 'normal-case',
            expected: 'return value'
        });
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
        if (func.returnType === 'never') {
            cases.push({
                function: func.name,
                case: 'edge-case-throws',
                expected: 'throw error'
            });
        }
        return cases;
    }
    async generateTests(filePath, sourceCode) {
        const analysis = this.analyzeCode(sourceCode);
        const moduleName = filePath.split('/').pop()?.replace('.ts', '') || 'Unknown';
        const importPath = filePath.replace('src/', '../src/').replace('.ts', '');
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
    generateTestBody(func, testCase) {
        if (testCase.case.includes('edge-case') && testCase.expected === 'throw error') {
            return `    expect(() => ${func.name}(10, 0)).toThrow();`;
        }
        const args = func.parameters.map((_, i) => `arg${i + 1}`).join(', ');
        return `    const result = ${func.name}(${args});\n    expect(result).toBeDefined();`;
    }
    async writeTestFile(sourcePath) {
        const sourceCode = await this.mcp.filesystem.readFile(sourcePath);
        const testCode = await this.generateTests(sourcePath, sourceCode);
        const testPath = sourcePath.replace('src/', 'tests/').replace('.ts', '.test.ts');
        await this.mcp.filesystem.writeFile({
            path: testPath,
            content: testCode
        });
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
//# sourceMappingURL=TestWriterAgent.js.map