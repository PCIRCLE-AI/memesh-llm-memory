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
 * Handles CLAUDE.md reload via MCP resources API
 */
export class ClaudeMdReloader {
  private reloadHistory: ReloadRecord[] = [];
  private lastReloadTime: Date | null = null;
  private cooldownMs: number;

  constructor(cooldownMs: number = 5 * 60 * 1000) {
    // Default 5 minutes
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
   */
  recordReload(record: ReloadRecord): void {
    const completeRecord = {
      ...record,
      timestamp: record.timestamp || new Date(),
    };

    this.reloadHistory.push(completeRecord);
    this.lastReloadTime = completeRecord.timestamp;

    // Keep only last 50 records
    if (this.reloadHistory.length > 50) {
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
  getStats() {
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
