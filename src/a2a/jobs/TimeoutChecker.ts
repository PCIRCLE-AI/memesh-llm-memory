import type { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';
import { logger } from '../../utils/logger.js';

export class TimeoutChecker {
  private delegator: MCPTaskDelegator;
  private intervalId: NodeJS.Timeout | null = null;
  private interval: number;

  constructor(delegator: MCPTaskDelegator) {
    this.delegator = delegator;
    this.interval = 60000; // 1 minute default
  }

  start(intervalMs: number = 60000): void {
    if (this.intervalId) {
      logger.warn('TimeoutChecker already running');
      return;
    }

    this.interval = intervalMs;

    this.intervalId = setInterval(async () => {
      try {
        await this.delegator.checkTimeouts();
      } catch (error) {
        logger.error('TimeoutChecker error', error);
      }
    }, intervalMs);

    logger.info(`TimeoutChecker started (interval: ${intervalMs}ms)`);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('TimeoutChecker stopped');
    }
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  getInterval(): number {
    return this.interval;
  }
}
