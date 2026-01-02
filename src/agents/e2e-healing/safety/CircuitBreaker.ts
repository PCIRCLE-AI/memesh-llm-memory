import { E2EHealingConfig } from '../types.js';

interface AttemptRecord {
  timestamp: number;
  success: boolean;
}

interface TestHistory {
  totalAttempts: number;
  consecutiveFailures: number;
  lastAttemptTime: number;
  attempts: AttemptRecord[];
}

export class CircuitBreaker {
  private history: Map<string, TestHistory> = new Map();
  private readonly MAX_HISTORY_SIZE = 100; // Max attempts to keep per test
  private readonly MAX_TESTS_TRACKED = 1000; // Max tests to track

  constructor(private config: E2EHealingConfig) {}

  canAttemptRepair(testId: string): boolean {
    const history = this.history.get(testId);

    // First attempt always allowed
    if (!history) {
      return true;
    }

    // Check 1: Max attempts reached
    if (history.totalAttempts >= this.config.maxAttempts) {
      return false;
    }

    // Check 2: Cooldown period active
    const timeSinceLastAttempt = Date.now() - history.lastAttemptTime;
    if (history.consecutiveFailures >= this.config.failureThreshold) {
      if (timeSinceLastAttempt < this.config.cooldownPeriod) {
        return false;
      }
    }

    // Check 3: Consecutive failures threshold
    if (history.consecutiveFailures >= this.config.failureThreshold) {
      return false;
    }

    return true;
  }

  recordAttempt(testId: string, success: boolean): void {
    const history = this.history.get(testId) || {
      totalAttempts: 0,
      consecutiveFailures: 0,
      lastAttemptTime: 0,
      attempts: [],
    };

    const record: AttemptRecord = {
      timestamp: Date.now(),
      success,
    };

    history.totalAttempts++;
    history.lastAttemptTime = record.timestamp;
    history.attempts.push(record);

    // Trim attempts array to prevent unbounded growth
    if (history.attempts.length > this.MAX_HISTORY_SIZE) {
      history.attempts = history.attempts.slice(-this.MAX_HISTORY_SIZE);
    }

    if (success) {
      // Reset consecutive failures and total attempts on success
      history.consecutiveFailures = 0;
      history.totalAttempts = 0;
    } else {
      history.consecutiveFailures++;
    }

    this.history.set(testId, history);

    // Cleanup old tests if we're tracking too many
    this.cleanupOldTests();
  }

  getHistory(testId: string): TestHistory | undefined {
    return this.history.get(testId);
  }

  reset(testId: string): void {
    this.history.delete(testId);
  }

  resetAll(): void {
    this.history.clear();
  }

  /**
   * Cleanup old tests to prevent unbounded Map growth
   *
   * Removes oldest tests (by lastAttemptTime) when limit exceeded.
   * Keeps tests with recent activity.
   */
  private cleanupOldTests(): void {
    if (this.history.size <= this.MAX_TESTS_TRACKED) {
      return;
    }

    // Sort by lastAttemptTime (oldest first)
    const entries = Array.from(this.history.entries()).sort(
      (a, b) => a[1].lastAttemptTime - b[1].lastAttemptTime
    );

    // Remove oldest 10% to avoid frequent cleanup
    const toRemove = Math.floor(this.MAX_TESTS_TRACKED * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.history.delete(entries[i][0]);
    }
  }
}
