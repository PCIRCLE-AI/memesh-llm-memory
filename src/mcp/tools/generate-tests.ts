// src/mcp/tools/generate-tests.ts
import { TestGenerator } from '../../tools/TestGenerator.js';
import { SamplingClient } from '../SamplingClient.js';

export interface GenerateTestsInput {
  specification?: string;
  code?: string;
}

export interface GenerateTestsOutput {
  testCode: string;
  message: string;
}

/**
 * Generate Tests Tool
 *
 * MCP tool for automated test case generation.
 * Uses sampling to generate comprehensive test suites.
 */
export async function generateTestsTool(
  input: GenerateTestsInput,
  samplingClient: SamplingClient
): Promise<GenerateTestsOutput> {
  const generator = new TestGenerator(samplingClient);

  let testCode: string;
  if (input.specification) {
    testCode = await generator.generateTests(input.specification);
  } else if (input.code) {
    testCode = await generator.generateTestsFromCode(input.code);
  } else {
    throw new Error('Either specification or code must be provided');
  }

  return {
    testCode,
    message: 'Test cases generated successfully. Review and adjust as needed.',
  };
}
