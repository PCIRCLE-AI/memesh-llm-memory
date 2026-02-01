// tests/unit/TestGenerator.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TestGenerator } from '../../src/tools/TestGenerator';

describe('TestGenerator', () => {
  it('should generate test cases from specification', async () => {
    const mockGenerate = vi.fn().mockResolvedValue(`
describe('Calculator', () => {
  it('should add two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });
});
    `);

    const generator = new TestGenerator({ generate: mockGenerate } as any);
    const result = await generator.generateTests('Add function that sums two numbers');

    expect(result).toContain('describe');
    expect(result).toContain('add(1, 2)');
  });
});
