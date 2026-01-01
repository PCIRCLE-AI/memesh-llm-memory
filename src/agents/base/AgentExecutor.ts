/**
 * Base Agent Executor
 *
 * Common execution pattern for all agents.
 * Reduces duplication across 30+ agent implementations.
 *
 * Pattern:
 * 1. Validate input
 * 2. Perform execution
 * 3. Handle errors
 */
export abstract class AgentExecutor<TInput, TOutput> {
  /**
   * Validate input before execution
   * @throws Error if input is invalid
   */
  protected abstract validateInput(input: TInput): void;

  /**
   * Perform the actual agent execution
   * @returns Execution result
   */
  protected abstract performExecution(input: TInput): Promise<TOutput>;

  /**
   * Handle execution errors
   * @returns Error response or fallback result
   */
  protected abstract handleError(error: Error): TOutput;

  /**
   * Execute the agent task
   * Main entry point following Template Method pattern
   */
  async execute(input: TInput): Promise<TOutput> {
    try {
      this.validateInput(input);
      const result = await this.performExecution(input);
      return result;
    } catch (error) {
      return this.handleError(error as Error);
    }
  }
}
