import { CircuitBreaker } from './CircuitBreaker.js';
import { ScopeLimiter } from './ScopeLimiter.js';
import type { GeneratedFix } from '../generators/FixGenerator.js';
import type { CodeChange } from '../types.js';

/**
 * Validation result from SafetyGate
 */
export interface SafetyValidationResult {
  /** Whether the fix is allowed to be applied */
  allowed: boolean;
  /** List of safety violations (empty if allowed) */
  violations: string[];
}

/**
 * SafetyGate - Unified safety validation combining CircuitBreaker + ScopeLimiter
 *
 * Provides a single entry point for all safety checks before applying fixes.
 * Integrates circuit breaker (failure tracking) and scope limiter (change constraints).
 */
export class SafetyGate {
  private attemptCounts: Map<string, number> = new Map();

  constructor(
    private circuitBreaker: CircuitBreaker,
    private scopeLimiter: ScopeLimiter,
    private maxAttempts: number
  ) {}

  /**
   * Validate a proposed fix against all safety constraints
   *
   * @param testId - Unique identifier for the test
   * @param testFile - Path to the test file
   * @param fix - Proposed fix to validate
   * @returns Validation result with allowed flag and violation list
   */
  validate(
    testId: string,
    testFile: string,
    fix: GeneratedFix
  ): SafetyValidationResult {
    const violations: string[] = [];

    // Track attempt count
    const attemptCount = (this.attemptCounts.get(testId) || 0) + 1;
    this.attemptCounts.set(testId, attemptCount);

    // Check 0: Max validation attempts
    if (attemptCount > this.maxAttempts) {
      violations.push(
        `max attempts (${this.maxAttempts}) exceeded for test ${testId}`
      );
    }

    // Check 1: Circuit Breaker (failure rate protection)
    if (!this.circuitBreaker.canAttemptRepair(testId)) {
      violations.push(
        `circuit breaker is open for test ${testId} - too many recent failures`
      );
    }

    // Check 2: Scope Limiter (change size and scope protection)
    const proposedChanges = this.convertToCodeChanges(fix);
    const scopeResult = this.scopeLimiter.validateRepairScope(
      testFile,
      proposedChanges
    );

    if (!scopeResult.valid) {
      violations.push(...scopeResult.violations);
    }

    return {
      allowed: violations.length === 0,
      violations,
    };
  }

  /**
   * Record a successful fix application
   *
   * Resets circuit breaker failure count for the test.
   *
   * @param testId - Unique identifier for the test
   */
  recordSuccess(testId: string): void {
    this.circuitBreaker.recordAttempt(testId, true);
    this.attemptCounts.delete(testId); // Reset attempt count on success
  }

  /**
   * Record a failed fix application
   *
   * Increments circuit breaker failure count for the test.
   *
   * @param testId - Unique identifier for the test
   */
  recordFailure(testId: string): void {
    this.circuitBreaker.recordAttempt(testId, false);
  }

  /**
   * Convert GeneratedFix to CodeChange[] format for ScopeLimiter
   *
   * @param fix - Generated fix from FixGenerator
   * @returns Array of code changes
   */
  private convertToCodeChanges(fix: GeneratedFix): CodeChange[] {
    const lines = fix.code.split('\n').length;

    return [
      {
        path: fix.targetFile,
        additions: lines,
        deletions: 0,
        diff: fix.code,
      },
    ];
  }
}
