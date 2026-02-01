// src/tools/TestGenerator.ts
import { SamplingClient } from '../mcp/SamplingClient.js';

/**
 * Test Generator
 *
 * Automatically generates test cases from specifications using sampling.
 */

export class TestGenerator {
  constructor(private samplingClient: SamplingClient) {}

  /**
   * Generate test cases from specification
   *
   * @param specification - Feature or function specification
   * @returns Generated test code
   */
  async generateTests(specification: string): Promise<string> {
    // Validate specification
    if (!specification || !specification.trim()) {
      throw new Error('Specification cannot be empty');
    }

    const prompt = `Generate comprehensive test cases in Vitest format for the following specification:

${specification}

Requirements:
- Use Vitest (describe, it, expect)
- Cover happy path and edge cases
- Include clear test descriptions
- Use TypeScript
- Follow TDD best practices

Generate ONLY the test code, no explanations.`;

    const testCode = await this.samplingClient.generate(prompt, {
      maxTokens: 2000,
      temperature: 0.3,
      systemPrompt: 'You are an expert test automation engineer. Generate high-quality, comprehensive test cases.',
    });

    return testCode;
  }

  /**
   * Generate test cases from existing code
   *
   * @param code - Source code to test
   * @returns Generated test code
   */
  async generateTestsFromCode(code: string): Promise<string> {
    // Validate code
    if (!code || !code.trim()) {
      throw new Error('Code cannot be empty');
    }

    const prompt = `Generate comprehensive test cases for the following code:

\`\`\`typescript
${code}
\`\`\`

Requirements:
- Use Vitest framework
- Cover all functions and edge cases
- Include integration tests if applicable
- Follow testing best practices

Generate ONLY the test code.`;

    const testCode = await this.samplingClient.generate(prompt, {
      maxTokens: 2500,
      temperature: 0.3,
      systemPrompt: 'You are an expert in software testing and quality assurance.',
    });

    return testCode;
  }
}
