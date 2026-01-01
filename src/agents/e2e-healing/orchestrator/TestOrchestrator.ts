import {
  HealingConstraints,
  HealingResult,
  TestResult,
  AttemptHistory,
  FixResult,
} from '../types.js';

interface E2EHealingContext {
  testFile: string;
  failureHistory: AttemptHistory[];
  codeContext?: string;
  constraints: HealingConstraints;
}

type TestRunner = (testFile: string) => Promise<TestResult>;
type Analyzer = (error: Error, context: E2EHealingContext) => Promise<{ rootCause: string }>;
type FixApplier = (analysis: { rootCause: string }, context: E2EHealingContext) => Promise<FixResult>;

export class TestOrchestrator {
  private maxAttempts: number;
  private testRunner?: TestRunner;
  private analyzer?: Analyzer;
  private fixApplier?: FixApplier;

  constructor(config: { maxAttempts: number }) {
    this.maxAttempts = config.maxAttempts;
  }

  setTestRunner(runner: TestRunner): void {
    this.testRunner = runner;
  }

  setAnalyzer(analyzer: Analyzer): void {
    this.analyzer = analyzer;
  }

  setFixApplier(applier: FixApplier): void {
    this.fixApplier = applier;
  }

  async healE2ETest(
    testFile: string,
    constraints: Partial<HealingConstraints>
  ): Promise<HealingResult> {
    if (!this.testRunner) {
      throw new Error('TestRunner not configured');
    }

    const context: E2EHealingContext = {
      testFile,
      failureHistory: [],
      constraints: constraints as HealingConstraints,
    };

    let currentAttempt = 0;

    while (currentAttempt < this.maxAttempts) {
      currentAttempt++;

      // Execute test
      const testResult = await this.testRunner(testFile);

      if (testResult.status === 'success') {
        return {
          status: 'healed',
          attempts: currentAttempt,
          history: context.failureHistory,
        };
      }

      // Analyze failure
      if (!this.analyzer || !testResult.error) {
        break;
      }

      const analysis = await this.analyzer(testResult.error, context);

      // Apply fix
      if (!this.fixApplier) {
        break;
      }

      const fixResult = await this.fixApplier(analysis, context);

      if (fixResult.status === 'skipped') {
        return {
          status: 'aborted',
          reason: fixResult.reason,
          attempts: currentAttempt,
          history: context.failureHistory,
        };
      }

      // Record attempt
      context.failureHistory.push({
        attemptNumber: currentAttempt,
        error: testResult.error,
        analysis: analysis.rootCause,
        fixApplied: fixResult,
        result: 'failed', // Will update if next iteration succeeds
      });
    }

    return {
      status: 'unhealed',
      attempts: currentAttempt,
      history: context.failureHistory,
      recommendation: 'Manual intervention required',
    };
  }
}
