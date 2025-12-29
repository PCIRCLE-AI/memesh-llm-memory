import { describe, it, expect } from 'vitest';
import { TestWriterAgent } from '../../src/agents/TestWriterAgent';
import { MCPToolInterface } from '../../src/core/MCPToolInterface';

describe('TestWriterAgent', () => {
  it('should generate test file for TypeScript source', async () => {
    const mcp = new MCPToolInterface();
    const agent = new TestWriterAgent(mcp);

    const sourceCode = `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `;

    const testCode = await agent.generateTests('src/utils.ts', sourceCode);

    expect(testCode).toContain('import { add } from');
    expect(testCode).toContain('describe(');
    expect(testCode).toContain('it(');
    expect(testCode).toContain('expect(');
  });

  it('should analyze code and extract test cases', () => {
    const mcp = new MCPToolInterface();
    const agent = new TestWriterAgent(mcp);

    const sourceCode = `
      export function divide(a: number, b: number): number {
        if (b === 0) throw new Error('Division by zero');
        return a / b;
      }
    `;

    const analysis = agent.analyzeCode(sourceCode);

    expect(analysis.functions).toHaveLength(1);
    expect(analysis.functions[0].name).toBe('divide');
    expect(analysis.testCases).toContainEqual({
      function: 'divide',
      case: 'edge-case-zero-division',
      expected: 'throw error'
    });
  });
});
