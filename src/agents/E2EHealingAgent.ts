import { MCPToolInterface } from '../core/MCPToolInterface.js';
import path from 'path';
import { TestOrchestrator } from './e2e-healing/orchestrator/TestOrchestrator.js';
import { E2EHealingConfig } from './e2e-healing/types.js';
import { DEFAULT_CONFIG } from './e2e-healing/config.js';
import { hashStackTrace } from '../telemetry/sanitization.js';

/**
 * Safety constants for E2E healing
 */
const MAX_LINES_CHANGED_PER_FIX = 100;
const MAX_DIRECTORY_DEPTH = 3;
const ALLOWED_FILE_PATTERNS = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
const FORBIDDEN_FILE_PATTERNS = ['**/node_modules/**', '**/dist/**'];

/**
 * E2E Healing Agent result summary (MCP interface)
 * Renamed from HealingResult to avoid collision with internal types.ts HealingResult
 */
export interface HealingResultSummary {
  success: boolean;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  healingAttempts: number;
  healingSuccesses: number;
  message: string;
  failedTests?: string[];
}

/**
 * E2E Healing Agent Options
 */
export interface E2EHealingOptions {
  /** Test file or directory to run */
  testPath: string;
  /** Optional configuration overrides */
  config?: Partial<E2EHealingConfig>;
  /** Whether to apply fixes automatically (default: false) */
  autoApply?: boolean;
  /** Environment to run in (default: 'dev') */
  environment?: string;
}

/**
 * E2EHealingAgent - MCP Integration for E2E Self-Healing
 *
 * Integrates the E2E Self-Healing system with MeMesh's MCP architecture.
 * Provides automated test execution, failure analysis, and code fixing with safety gates.
 *
 * Features:
 * - Playwright-powered browser automation
 * - Automatic failure analysis using Claude
 * - Code fix generation and application
 * - Safety mechanisms (circuit breaker, scope limiting, rollback)
 * - Graduated autonomy model
 * - Integration with MeMesh's memory and filesystem tools
 *
 * Classification: REAL_IMPLEMENTATION
 * MCP Tools: playwright, filesystem, bash, memory
 * Capabilities: e2e-testing, auto-healing, testing, code-generation, debugging
 *
 * @example
 * ```typescript
 * const agent = new E2EHealingAgent(mcpTools);
 *
 * // Run tests with auto-healing
 * const result = await agent.runTests({
 *   testPath: 'tests/e2e/login.spec.ts',
 *   autoApply: false, // Start conservative (suggest-only mode)
 *   environment: 'dev'
 * });
 *
 * console.log(`Tests: ${result.testsPassed}/${result.testsRun} passed`);
 * console.log(`Healing: ${result.healingSuccesses}/${result.healingAttempts} successful`);
 * ```
 */
export class E2EHealingAgent {
  private orchestrator: TestOrchestrator;
  private config: E2EHealingConfig;

  constructor(private mcp: MCPToolInterface, config?: Partial<E2EHealingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize orchestrator with config
    this.orchestrator = new TestOrchestrator({
      maxAttempts: this.config.maxAttempts,
    });
  }

  /**
   * Run E2E tests with auto-healing
   *
   * @param options - Test execution options
   * @returns Healing result with test statistics
   */
  async runTests(options: E2EHealingOptions): Promise<HealingResultSummary> {
    const { testPath, autoApply = false, environment = 'dev' } = options;

    // Validate test path to prevent path traversal attacks
    if (!testPath || typeof testPath !== 'string') {
      throw new Error('Invalid test path: must be a non-empty string');
    }

    const normalizedTestPath = testPath.trim();

    if (normalizedTestPath.length === 0) {
      throw new Error('Invalid test path: must be a non-empty string');
    }

    if (path.isAbsolute(normalizedTestPath)) {
      throw new Error('Invalid test path: absolute paths are not allowed');
    }

    // Check for path traversal attempts
    if (normalizedTestPath.includes('..') || normalizedTestPath.includes('\0')) {
      throw new Error('Invalid test path: path traversal not allowed');
    }

    // Ensure path looks like a test file
    if (!normalizedTestPath.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/)) {
      throw new Error('Invalid test path: must be a test file (.test.ts, .spec.ts, etc.)');
    }

    if (normalizedTestPath.startsWith('-')) {
      throw new Error('Invalid test path: cannot start with "-"');
    }

    const safePathPattern = /^[a-zA-Z0-9_.\/\-]+$/;
    if (!safePathPattern.test(normalizedTestPath)) {
      throw new Error('Invalid test path: contains unsupported characters');
    }

    try {
      // Record to Knowledge Graph
      await this.mcp.memory.createEntities({
        entities: [
          {
            name: `E2E Test Run ${new Date().toISOString()}`,
            entityType: 'e2e_test_run',
            observations: [
              `Test path: ${normalizedTestPath}`,
              `Auto-apply: ${autoApply}`,
              `Environment: ${environment}`,
              `Started at: ${new Date().toISOString()}`,
            ],
          },
        ],
      });

      // Use orchestrator's healE2ETest method
      const result = await this.orchestrator.healE2ETest(normalizedTestPath, {
        maxAttempts: this.config.maxAttempts,
        maxFilesModified: this.config.maxAttempts,
        maxLinesChanged: MAX_LINES_CHANGED_PER_FIX,
        allowedFilePatterns: ALLOWED_FILE_PATTERNS,
        forbiddenFilePatterns: FORBIDDEN_FILE_PATTERNS,
        maxDirectoryDepth: MAX_DIRECTORY_DEPTH,
      });

      // Convert healing result to our format
      const healingResult: HealingResultSummary = {
        success: result.status === 'healed',
        testsRun: 1,
        testsPassed: result.status === 'healed' ? 1 : 0,
        testsFailed: result.status === 'healed' ? 0 : 1,
        healingAttempts: result.attempts,
        healingSuccesses: result.status === 'healed' ? 1 : 0,
        message: this.formatOrchestratorResult(result),
        failedTests: result.status !== 'healed' ? [normalizedTestPath] : undefined,
      };

      // Record result to Knowledge Graph
      await this.mcp.memory.createEntities({
        entities: [
          {
            name: `E2E Test Result ${new Date().toISOString()}`,
            entityType: 'e2e_test_result',
            observations: [
              `Test path: ${normalizedTestPath}`,
              `Status: ${result.status}`,
              `Attempts: ${result.attempts}`,
              `Completed at: ${new Date().toISOString()}`,
            ],
          },
        ],
      });

      return healingResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const stackTrace = error instanceof Error ? error.stack : undefined;

      // Record error to Knowledge Graph with stack trace for debugging
      const observations = [
        `Test path: ${normalizedTestPath}`,
        `Error: ${errorMessage}`,
        `Failed at: ${new Date().toISOString()}`,
      ];

      if (stackTrace) {
        observations.push(`Stack trace hash: ${hashStackTrace(stackTrace)}`);
      }

      await this.mcp.memory.createEntities({
        entities: [
          {
            name: `E2E Test Error ${new Date().toISOString()}`,
            entityType: 'e2e_test_error',
            observations,
          },
        ],
      });

      throw error;
    }
  }

  /**
   * Format TestOrchestrator result to user-friendly message
   *
   * @param result - HealingResult from TestOrchestrator
   * @returns User-friendly message describing the healing outcome
   */
  private formatOrchestratorResult(result: {
    status: 'healed' | 'unhealed' | 'aborted';
    attempts: number;
    reason?: string;
    recommendation?: string;
  }): string {
    const lines: string[] = [];

    // Status message
    switch (result.status) {
      case 'healed':
        lines.push(`✅ Test healed successfully after ${result.attempts} attempt(s)`);
        break;
      case 'unhealed':
        lines.push(
          `❌ Test could not be healed after ${result.attempts} attempt(s)`
        );
        break;
      case 'aborted':
        lines.push(
          `⚠️  Healing aborted after ${result.attempts} attempt(s)`
        );
        break;
      default:
        // Exhaustiveness check - should never reach here
        const _exhaustiveCheck: never = result.status;
        throw new Error(`Unexpected healing status: ${_exhaustiveCheck}`);
    }

    // Add reason if present
    if (result.reason) {
      lines.push(`Reason: ${result.reason}`);
    }

    // Add recommendation if present
    if (result.recommendation) {
      lines.push(`Recommendation: ${result.recommendation}`);
    }

    return lines.join('\n');
  }


  /**
   * Get agent configuration
   */
  getConfig(): E2EHealingConfig {
    return this.config;
  }

  /**
   * Update agent configuration
   */
  updateConfig(updates: Partial<E2EHealingConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
