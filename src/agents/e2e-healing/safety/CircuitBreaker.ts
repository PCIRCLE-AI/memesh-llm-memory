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

    if (success) {
      // Reset consecutive failures on success
      history.consecutiveFailures = 0;
    } else {
      history.consecutiveFailures++;
    }

    this.history.set(testId, history);
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
}
