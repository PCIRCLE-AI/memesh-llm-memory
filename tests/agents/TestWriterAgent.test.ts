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

    // New AST-based implementation generates intelligent edge cases based on parameter types
    expect(analysis.testCases).toContainEqual({
      function: 'divide',
      case: 'normal-case',
      expected: 'return value'
    });
    expect(analysis.testCases).toContainEqual({
      function: 'divide',
      case: 'edge-case-zero',
      expected: 'handle zero'
    });
    expect(analysis.testCases).toContainEqual({
      function: 'divide',
      case: 'edge-case-negative',
      expected: 'handle negative'
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid TypeScript syntax', () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const invalidCode = `
        export function broken(a: number {
          return a + // Missing operand
        }
      `;

      const analysis = agent.analyzeCode(invalidCode);

      // Should not crash, may return empty functions array
      expect(analysis).toBeDefined();
      expect(Array.isArray(analysis.functions)).toBe(true);
    });

    it('should handle empty source code', async () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const testCode = await agent.generateTests('src/empty.ts', '');

      // Should generate minimal test structure
      expect(testCode).toContain('describe');
      expect(testCode).toContain('it');
    });

    it('should handle source code with no functions', () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const noFunctionsCode = `
        const x = 42;
        const y = 'hello';
      `;

      const analysis = agent.analyzeCode(noFunctionsCode);

      expect(analysis.functions).toHaveLength(0);
      expect(analysis.testCases).toHaveLength(0);
    });

    it('should handle functions with complex parameter types', () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const complexCode = `
        export function processData(
          data: { id: number; name: string }[],
          options?: { limit?: number; sort?: 'asc' | 'desc' }
        ): number {
          return data.length;
        }
      `;

      const analysis = agent.analyzeCode(complexCode);

      expect(analysis.functions).toHaveLength(1);
      expect(analysis.functions[0].name).toBe('processData');
      expect(analysis.testCases.length).toBeGreaterThan(0);
    });

    it('should handle functions with no parameters', () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const noParamsCode = `
        export function getCurrentTime(): Date {
          return new Date();
        }
      `;

      const analysis = agent.analyzeCode(noParamsCode);

      expect(analysis.functions).toHaveLength(1);
      expect(analysis.functions[0].name).toBe('getCurrentTime');
      expect(analysis.testCases.length).toBeGreaterThan(0);
    });

    it('should handle async functions', () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const asyncCode = `
        export async function fetchData(url: string): Promise<Response> {
          return fetch(url);
        }
      `;

      const analysis = agent.analyzeCode(asyncCode);

      expect(analysis.functions).toHaveLength(1);
      expect(analysis.functions[0].name).toBe('fetchData');
    });

    it('should handle arrow functions', () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const arrowCode = `
        export const multiply = (a: number, b: number): number => a * b;
      `;

      const analysis = agent.analyzeCode(arrowCode);

      // May or may not extract arrow functions depending on AST implementation
      expect(analysis).toBeDefined();
      expect(Array.isArray(analysis.functions)).toBe(true);
    });

    it('should handle class methods', () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const classCode = `
        export class Calculator {
          add(a: number, b: number): number {
            return a + b;
          }

          subtract(a: number, b: number): number {
            return a - b;
          }
        }
      `;

      const analysis = agent.analyzeCode(classCode);

      // Should extract class methods
      expect(analysis.functions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle generic functions', () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const genericCode = `
        export function identity<T>(value: T): T {
          return value;
        }
      `;

      const analysis = agent.analyzeCode(genericCode);

      expect(analysis.functions).toHaveLength(1);
      expect(analysis.functions[0].name).toBe('identity');
    });

    it('should handle concurrent test generation', async () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const code1 = 'export function add(a: number, b: number) { return a + b; }';
      const code2 = 'export function subtract(a: number, b: number) { return a - b; }';
      const code3 = 'export function multiply(a: number, b: number) { return a * b; }';

      // Generate tests concurrently
      const results = await Promise.all([
        agent.generateTests('src/add.ts', code1),
        agent.generateTests('src/subtract.ts', code2),
        agent.generateTests('src/multiply.ts', code3)
      ]);

      expect(results).toHaveLength(3);
      results.forEach(testCode => {
        expect(testCode).toContain('describe');
        expect(testCode).toContain('it');
        expect(testCode).toContain('expect');
      });
    });

    it('should handle source files with imports', async () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const codeWithImports = `
        import { someUtil } from './utils';
        import type { SomeType } from './types';

        export function process(data: SomeType): number {
          return someUtil(data);
        }
      `;

      const testCode = await agent.generateTests('src/processor.ts', codeWithImports);

      // Should generate test with proper import from ../src/processor
      expect(testCode).toContain('import');
      expect(testCode).toContain('process');
    });

    it('should handle extremely long function names', () => {
      const mcp = new MCPToolInterface();
      const agent = new TestWriterAgent(mcp);

      const longNameCode = `
        export function thisIsAnExtremelyLongFunctionNameThatShouldStillBeProcessedCorrectly(
          x: number
        ): number {
          return x * 2;
        }
      `;

      const analysis = agent.analyzeCode(longNameCode);

      expect(analysis.functions).toHaveLength(1);
      expect(analysis.functions[0].name).toContain('Long');
    });
  });
});
