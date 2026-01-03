export var AutomationLevel;
(function (AutomationLevel) {
    AutomationLevel[AutomationLevel["SUGGEST_ONLY"] = 0] = "SUGGEST_ONLY";
    AutomationLevel[AutomationLevel["AUTO_DEV"] = 1] = "AUTO_DEV";
    AutomationLevel[AutomationLevel["AUTO_STAGING"] = 2] = "AUTO_STAGING";
    AutomationLevel[AutomationLevel["AUTO_PROD"] = 3] = "AUTO_PROD";
})(AutomationLevel || (AutomationLevel = {}));
export class GraduatedAutonomyPolicy {
    currentLevel = AutomationLevel.SUGGEST_ONLY;
    fixHistory = [];
    MAX_FIX_HISTORY = 1000;
    rollbackCount = 0;
    graduationCriteria = {
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
    getCurrentLevel() {
        return this.currentLevel;
    }
    recordFix(record) {
        this.fixHistory.push({
            ...record,
            timestamp: Date.now(),
        });
        if (this.fixHistory.length > this.MAX_FIX_HISTORY) {
            this.fixHistory = this.fixHistory.slice(-this.MAX_FIX_HISTORY);
        }
    }
    recordRollback(environment) {
        this.rollbackCount++;
        const criteria = this.graduationCriteria[this.currentLevel];
        if (this.rollbackCount > criteria.maxRollbacks) {
            this.degradeLevel();
        }
    }
    canGraduateToNextLevel() {
        const nextLevel = this.currentLevel + 1;
        if (nextLevel > AutomationLevel.AUTO_PROD) {
            return false;
        }
        if (!this.isValidAutomationLevel(nextLevel)) {
            throw new Error(`Invalid automation level: ${nextLevel}`);
        }
        const criteria = this.graduationCriteria[nextLevel];
        const stats = this.calculateStats();
        return (stats.successfulFixes >= criteria.minSuccessfulFixes &&
            stats.successRate >= criteria.minSuccessRate &&
            this.rollbackCount <= criteria.maxRollbacks &&
            stats.approvalRate >= criteria.humanApprovalRate);
    }
    isValidAutomationLevel(level) {
        return (level >= AutomationLevel.SUGGEST_ONLY &&
            level <= AutomationLevel.AUTO_PROD);
    }
    graduateToNextLevel() {
        if (!this.canGraduateToNextLevel()) {
            throw new Error('Cannot graduate: criteria not met');
        }
        this.currentLevel++;
        this.rollbackCount = 0;
    }
    degradeLevel() {
        if (this.currentLevel > AutomationLevel.SUGGEST_ONLY) {
            this.currentLevel--;
            this.rollbackCount = 0;
        }
    }
    isAllowedInEnvironment(environment) {
        switch (this.currentLevel) {
            case AutomationLevel.SUGGEST_ONLY:
                return false;
            case AutomationLevel.AUTO_DEV:
                return environment === 'dev';
            case AutomationLevel.AUTO_STAGING:
                return environment === 'dev' || environment === 'staging';
            case AutomationLevel.AUTO_PROD:
                return true;
            default:
                return false;
        }
    }
    calculateStats() {
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
//# sourceMappingURL=GraduatedAutonomyPolicy.js.map