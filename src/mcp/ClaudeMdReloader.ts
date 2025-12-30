/**
 * Reload reason types
 */
export type ReloadReason =
  | 'token-threshold'
  | 'quality-degradation'
  | 'manual'
  | 'context-staleness';

/**
 * Reload trigger source
 */
export type ReloadTrigger = 'auto' | 'user' | 'system';

/**
 * Reload record
 */
export interface ReloadRecord {
  reason: ReloadReason;
  triggeredBy: ReloadTrigger;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * MCP resource update request
 */
export interface ResourceUpdateRequest {
  method: 'resources/updated';
  params: {
    uri: string;
  };
}

/**
 * Reload statistics
 */
export interface ReloadStats {
  totalReloads: number;
  lastReloadTime: Date | null;
  reasonCounts: Record<string, number>;
  cooldownMs: number;
  canReloadNow: boolean;
}

/**
 * Handles CLAUDE.md reload via MCP resources API
 */
export class ClaudeMdReloader {
  private static readonly MAX_HISTORY_SIZE = 50;

  private reloadHistory: ReloadRecord[] = [];
  private lastReloadTime: Date | null = null;
  private cooldownMs: number;

  constructor(cooldownMs: number = 5 * 60 * 1000) {
    // CRITICAL ISSUE 1: Validate constructor input
    if (cooldownMs <= 0) {
      throw new Error('cooldownMs must be positive');
    }
    this.cooldownMs = cooldownMs;
  }

  /**
   * Generate MCP resource update request for CLAUDE.md
   */
  generateReloadRequest(): ResourceUpdateRequest {
    return {
      method: 'resources/updated',
      params: {
        uri: 'file://~/.claude/CLAUDE.md',
      },
    };
  }

  /**
   * Check if reload is allowed (respects cooldown)
   */
  canReload(): boolean {
    if (!this.lastReloadTime) {
      return true; // First reload
    }

    const timeSinceLastReload = Date.now() - this.lastReloadTime.getTime();
    return timeSinceLastReload >= this.cooldownMs;
  }

  /**
   * Record a reload event
   *
   * NOTE: Not thread-safe. Caller must ensure serial access in concurrent environments.
   */
  recordReload(record: ReloadRecord): void {
    // CRITICAL ISSUE 2: Validate required fields
    if (!record.reason || !record.triggeredBy) {
      throw new Error('reason and triggeredBy are required');
    }

    const completeRecord = {
      ...record,
      timestamp: record.timestamp || new Date(),
    };

    this.reloadHistory.push(completeRecord);
    this.lastReloadTime = completeRecord.timestamp;

    // IMPORTANT ISSUE 3: Use constant instead of magic number
    if (this.reloadHistory.length > ClaudeMdReloader.MAX_HISTORY_SIZE) {
      this.reloadHistory.shift();
    }
  }

  /**
   * Get reload history
   */
  getReloadHistory(): ReloadRecord[] {
    return [...this.reloadHistory];
  }

  /**
   * Get statistics about reloads
   */
  getStats(): ReloadStats {
    const reasonCounts: Record<string, number> = {};
    for (const record of this.reloadHistory) {
      reasonCounts[record.reason] = (reasonCounts[record.reason] || 0) + 1;
    }

    return {
      totalReloads: this.reloadHistory.length,
      lastReloadTime: this.lastReloadTime,
      reasonCounts,
      cooldownMs: this.cooldownMs,
      canReloadNow: this.canReload(),
    };
  }
}
