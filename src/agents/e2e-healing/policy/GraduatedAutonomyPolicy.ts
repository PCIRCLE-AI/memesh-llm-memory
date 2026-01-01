export enum AutomationLevel {
  SUGGEST_ONLY = 0, // AI suggests, human applies
  AUTO_DEV = 1, // Auto-apply in dev, suggest in staging/prod
  AUTO_STAGING = 2, // Auto-apply in dev+staging, approve for prod
  AUTO_PROD = 3, // Auto-apply everywhere (with safety gates)
}

interface FixRecord {
  success: boolean;
  humanApproved: boolean;
  environment: string;
  timestamp: number;
}

interface GraduationCriteria {
  minSuccessfulFixes: number;
  minSuccessRate: number;
  maxRollbacks: number;
  humanApprovalRate: number;
}

/**
 * GraduatedAutonomyPolicy - Progressive trust model for auto-healing
 *
 * Starts conservative (SUGGEST_ONLY) and graduates to higher autonomy levels
 * based on demonstrated success. Automatically degrades on excessive rollbacks.
 *
 * Autonomy Levels:
 * - SUGGEST_ONLY: AI suggests, human applies (default)
 * - AUTO_DEV: Auto-apply in dev, suggest elsewhere
 * - AUTO_STAGING: Auto-apply in dev+staging, approve for prod
 * - AUTO_PROD: Auto-apply everywhere (with safety gates)
 */
export class GraduatedAutonomyPolicy {
  private currentLevel: AutomationLevel = AutomationLevel.SUGGEST_ONLY;
  private fixHistory: FixRecord[] = [];
  private rollbackCount: number = 0;

  private graduationCriteria: Record<AutomationLevel, GraduationCriteria> = {
    [AutomationLevel.SUGGEST_ONLY]: {
      minSuccessfulFixes: 0,
      minSuccessRate: 0,
      maxRollbacks: 0,
      humanApprovalRate: 0,
    },
    [AutomationLevel.AUTO_DEV]: {
      minSuccessfulFixes: 10,
      minSuccessRate: 0.9,
      maxRollbacks: 1,
      humanApprovalRate: 0.95,
    },
    [AutomationLevel.AUTO_STAGING]: {
      minSuccessfulFixes: 50,
      minSuccessRate: 0.95,
      maxRollbacks: 2,
      humanApprovalRate: 0.98,
    },
    [AutomationLevel.AUTO_PROD]: {
      minSuccessfulFixes: 200,
      minSuccessRate: 0.98,
      maxRollbacks: 0,
      humanApprovalRate: 0.99,
    },
  };

  getCurrentLevel(): AutomationLevel {
    return this.currentLevel;
  }

  recordFix(record: Omit<FixRecord, 'timestamp'>): void {
    this.fixHistory.push({
      ...record,
      timestamp: Date.now(),
    });
  }

  recordRollback(environment: string): void {
    this.rollbackCount++;

    // Auto-degrade if too many rollbacks
    const criteria = this.graduationCriteria[this.currentLevel];
    if (this.rollbackCount > criteria.maxRollbacks) {
      this.degradeLevel();
    }
  }

  canGraduateToNextLevel(): boolean {
    const nextLevel = this.currentLevel + 1;
    if (nextLevel > AutomationLevel.AUTO_PROD) {
      return false;
    }

    const criteria = this.graduationCriteria[nextLevel];
    const stats = this.calculateStats();

    return (
      stats.successfulFixes >= criteria.minSuccessfulFixes &&
      stats.successRate >= criteria.minSuccessRate &&
      this.rollbackCount <= criteria.maxRollbacks &&
      stats.approvalRate >= criteria.humanApprovalRate
    );
  }

  graduateToNextLevel(): void {
    if (!this.canGraduateToNextLevel()) {
      throw new Error('Cannot graduate: criteria not met');
    }

    this.currentLevel++;
    this.rollbackCount = 0; // Reset rollback counter on graduation
  }

  degradeLevel(): void {
    if (this.currentLevel > AutomationLevel.SUGGEST_ONLY) {
      this.currentLevel--;
      this.rollbackCount = 0;
    }
  }

  isAllowedInEnvironment(environment: string): boolean {
    switch (this.currentLevel) {
      case AutomationLevel.SUGGEST_ONLY:
        return false; // Only suggest, never auto-apply

      case AutomationLevel.AUTO_DEV:
        return environment === 'dev';

      case AutomationLevel.AUTO_STAGING:
        return environment === 'dev' || environment === 'staging';

      case AutomationLevel.AUTO_PROD:
        return true; // All environments (with safety gates)

      default:
        return false;
    }
  }

  private calculateStats() {
    const totalFixes = this.fixHistory.length;
    const successfulFixes = this.fixHistory.filter((f) => f.success).length;
    const approvedFixes = this.fixHistory.filter((f) => f.humanApproved).length;

    return {
      successfulFixes,
      successRate: totalFixes > 0 ? successfulFixes / totalFixes : 0,
      approvalRate: totalFixes > 0 ? approvedFixes / totalFixes : 0,
    };
  }
}
