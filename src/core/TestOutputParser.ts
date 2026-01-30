/**
 * Test Output Parser - Extract Test Results from Framework Outputs
 *
 * Parses test output from popular test frameworks (Vitest, Jest, Mocha) to extract
 * test counts and detailed failure information. Supports multiple output formats
 * and provides structured data for test result tracking.
 *
 * Supported Frameworks:
 * - **Vitest**: " FAIL  <file> > <suite> > <test>"
 * - **Jest**: " ● <suite> › <test>"
 * - **Mocha**: "  1) Suite test:" or "  1) Suite\n     test:"
 *
 * @example
 * ```typescript
 * import { TestOutputParser } from './TestOutputParser.js';
 *
 * const parser = new TestOutputParser();
 * const results = parser.parse(testOutput);
 *
 * console.log(`${results.passed}/${results.total} tests passed`);
 * if (results.failed > 0) {
 *   results.failedTests.forEach(test => {
 *     console.log(`Failed: ${test.name} - ${test.error}`);
 *   });
 * }
 * ```
 */

/**
 * Failed test details extracted from test output
 */
export interface FailedTest {
  /** Test name (including suite path for nested tests) */
  name: string;

  /** File path where the test is located (if extractable from output) */
  file?: string;

  /** Error message or type (if extracted from output) */
  error?: string;
}

/**
 * Test results with detailed failure information
 */
export interface TestResults {
  /** Total number of tests */
  total: number;

  /** Number of passed tests */
  passed: number;

  /** Number of failed tests */
  failed: number;

  /** Array of failed test details (empty if no failures or unknown format) */
  failedTests: FailedTest[];

  /** Allow additional properties for compatibility with Record<string, unknown> */
  [key: string]: unknown;
}

/**
 * Test Output Parser
 *
 * Extracts test results from framework output strings. Handles multiple test
 * frameworks and output formats, providing structured data for test tracking.
 *
 * Performance optimized for large outputs.
 */
export class TestOutputParser {
  /**
   * Parse test output and extract results
   *
   * Automatically detects test framework and extracts test counts plus detailed
   * failure information. Returns zero counts if no test patterns found.
   *
   * @param output - Raw test output string from test runner
   * @returns Parsed test results with counts and failure details
   */
  parse(output: string): TestResults {
    const passedPattern = /(\d+)\s+(?:tests?\s+)?pass(?:ed|ing)/gi;
    const failedPattern = /(\d+)\s+(?:tests?\s+)?fail(?:ed|ing)/gi;

    let passed = 0;
    let failed = 0;
    let match: RegExpExecArray | null;

    while ((match = passedPattern.exec(output)) !== null) {
      passed = parseInt(match[1], 10);
    }

    while ((match = failedPattern.exec(output)) !== null) {
      failed = parseInt(match[1], 10);
    }

    const total = passed + failed;
    let failedTests: FailedTest[] = [];

    if (failed > 0) {
      const framework = this.detectFramework(output);
      switch (framework) {
        case 'vitest':
          failedTests = this.parseVitestFailures(output);
          break;
        case 'jest':
          failedTests = this.parseJestFailures(output);
          break;
        case 'mocha':
          failedTests = this.parseMochaFailures(output);
          break;
      }
    }

    return { total, passed, failed, failedTests };
  }

  private detectFramework(output: string): 'vitest' | 'jest' | 'mocha' | 'unknown' {
    // Check for Vitest first (FAIL with > separator)
    if (output.includes(' > ') && output.includes('FAIL  ')) return 'vitest';
    // Check for Jest (FAIL with bullet separator)
    if (output.includes(' ● ')) return 'jest';
    // Check for Mocha (numbered failures with passing/failing summary)
    if (/\d+\)/.test(output) && /\d+\s+(?:passing|failing)/.test(output)) return 'mocha';
    return 'unknown';
  }

  private parseVitestFailures(output: string): FailedTest[] {
    const failures: FailedTest[] = [];
    const lines = output.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const failMatch = /^\s*FAIL\s+(.+?)\s+>\s+(.+?)$/.exec(line);

      if (failMatch) {
        const fullPath = failMatch[1].trim();
        const testPath = failMatch[2].trim();
        const file = fullPath.includes('>') ? fullPath.split('>')[0].trim() : fullPath;
        const name = testPath;

        let error: string | undefined;
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine && !nextLine.startsWith('FAIL') && !nextLine.startsWith('Test Files')) {
            error = nextLine;
          }
        }

        failures.push({ name, file, error });
      }
    }

    return failures;
  }

  private parseJestFailures(output: string): FailedTest[] {
    const failures: FailedTest[] = [];
    const lines = output.split('\n');
    const files: string[] = [];

    for (const line of lines) {
      const fileMatch = /^\s*FAIL\s+(.+?)$/.exec(line);
      if (fileMatch && !line.includes('●')) {
        files.push(fileMatch[1].trim());
      }
    }

    let currentFileIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const failMatch = /^\s*●\s+(.+?)$/.exec(line);

      if (failMatch) {
        const name = failMatch[1].trim();
        const file = files[currentFileIndex];

        let error: string | undefined;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const errorLine = lines[j].trim();
          if (errorLine && !errorLine.includes('●') && !errorLine.startsWith('FAIL')) {
            error = errorLine;
            break;
          }
        }

        failures.push({ name, file, error });
      }
    }

    return failures;
  }

  private parseMochaFailures(output: string): FailedTest[] {
    const failures: FailedTest[] = [];
    const lines = output.split('\n');
    let inFailingSection = false;
    let failingSectionStart = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/\d+\s+failing/.test(line)) {
        inFailingSection = true;
        failingSectionStart = i;
        continue;
      }

      if (!inFailingSection || i <= failingSectionStart) continue;
      if (line.trim().startsWith('npm ') || line.trim().startsWith('Error: ')) break;

      const singleLineMatch = /^\s*\d+\)\s+(.+?):\s*$/.exec(line);
      if (singleLineMatch) {
        const name = singleLineMatch[1].trim();
        let error: string | undefined;
        if (i + 1 < lines.length) {
          const errorLine = lines[i + 1].trim();
          if (errorLine && !errorLine.match(/^\d+\)/) && !errorLine.startsWith('at ')) {
            error = errorLine;
          }
        }
        failures.push({ name, error });
        continue;
      }

      const suiteMatch = /^\s*(\d+)\)\s+(.+?)\s*$/.exec(line);
      if (suiteMatch && i + 1 < lines.length) {
        const suite = suiteMatch[2].trim();
        const nextLine = lines[i + 1].trim();

        if (nextLine.endsWith(':') && lines[i + 1].startsWith('     ')) {
          const testName = nextLine.slice(0, -1).trim();
          const name = `${suite} ${testName}`;

          let error: string | undefined;
          if (i + 2 < lines.length) {
            const errorLine = lines[i + 2].trim();
            if (errorLine && !errorLine.match(/^\d+\)/) && !errorLine.startsWith('at ')) {
              error = errorLine;
            }
          }

          failures.push({ name, error });
        }
      }
    }

    return failures;
  }
}
