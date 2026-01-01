import { describe, it, expect } from 'vitest';
import { AgentExecutor } from '../AgentExecutor.js';

// Test implementation
class TestAgent extends AgentExecutor<string, number> {
  protected validateInput(input: string): void {
    if (!input) {
      throw new Error('Input required');
    }
    if (input.length > 100) {
      throw new Error('Input too long');
    }
  }

  protected async performExecution(input: string): Promise<number> {
    return input.length;
  }

  protected handleError(error: Error): number {
    return -1;
  }
}

describe('AgentExecutor', () => {
  it('should execute successfully with valid input', async () => {
    const agent = new TestAgent();
    const result = await agent.execute('hello');
    expect(result).toBe(5);
  });

  it('should handle validation errors', async () => {
    const agent = new TestAgent();
    const result = await agent.execute('');
    expect(result).toBe(-1);
  });

  it('should handle execution errors', async () => {
    class FailingAgent extends AgentExecutor<string, string> {
      protected validateInput(input: string): void {
        // valid
      }

      protected async performExecution(input: string): Promise<string> {
        throw new Error('Execution failed');
      }

      protected handleError(error: Error): string {
        return `Error: ${error.message}`;
      }
    }

    const agent = new FailingAgent();
    const result = await agent.execute('test');
    expect(result).toBe('Error: Execution failed');
  });

  it('should work with complex types', async () => {
    interface ComplexInput {
      data: string[];
      options: { verbose: boolean };
    }

    interface ComplexOutput {
      processed: number;
      errors: string[];
    }

    class ComplexAgent extends AgentExecutor<ComplexInput, ComplexOutput> {
      protected validateInput(input: ComplexInput): void {
        if (!input.data || input.data.length === 0) {
          throw new Error('Data required');
        }
      }

      protected async performExecution(input: ComplexInput): Promise<ComplexOutput> {
        return {
          processed: input.data.length,
          errors: [],
        };
      }

      protected handleError(error: Error): ComplexOutput {
        return {
          processed: 0,
          errors: [error.message],
        };
      }
    }

    const agent = new ComplexAgent();
    const result = await agent.execute({
      data: ['a', 'b', 'c'],
      options: { verbose: true },
    });

    expect(result.processed).toBe(3);
    expect(result.errors).toEqual([]);
  });
});
