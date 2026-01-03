import { ValidationError } from '../errors/index.js';
export class ClaudeMdReloader {
    static MAX_HISTORY_SIZE = 50;
    reloadHistory = [];
    lastReloadTime = null;
    cooldownMs;
    isRecording = false;
    pendingRecords = [];
    constructor(cooldownMs = 5 * 60 * 1000) {
        if (cooldownMs <= 0) {
            throw new ValidationError('cooldownMs must be positive', {
                component: 'ClaudeMdReloader',
                method: 'constructor',
                providedValue: cooldownMs,
                constraint: 'cooldownMs > 0',
            });
        }
        this.cooldownMs = cooldownMs;
    }
    generateReloadRequest() {
        return {
            method: 'resources/updated',
            params: {
                uri: 'file://~/.claude/CLAUDE.md',
            },
        };
    }
    canReload() {
        if (!this.lastReloadTime) {
            return true;
        }
        const timeSinceLastReload = Date.now() - this.lastReloadTime.getTime();
        return timeSinceLastReload >= this.cooldownMs;
    }
    recordReload(record) {
        if (!record.reason || !record.triggeredBy) {
            throw new ValidationError('reason and triggeredBy are required', {
                component: 'ClaudeMdReloader',
                method: 'recordReload',
                providedReason: record.reason,
                providedTriggeredBy: record.triggeredBy,
                requiredFields: ['reason', 'triggeredBy'],
            });
        }
        if (this.isRecording) {
            this.pendingRecords.push(record);
            return;
        }
        this.isRecording = true;
        try {
            this.processRecordUnsafe(record);
            while (this.pendingRecords.length > 0) {
                const pending = this.pendingRecords.shift();
                this.processRecordUnsafe(pending);
            }
        }
        finally {
            this.isRecording = false;
        }
    }
    processRecordUnsafe(record) {
        const completeRecord = {
            ...record,
            timestamp: record.timestamp || new Date(),
        };
        this.reloadHistory.push(completeRecord);
        this.lastReloadTime = completeRecord.timestamp;
        if (this.reloadHistory.length > ClaudeMdReloader.MAX_HISTORY_SIZE) {
            this.reloadHistory.shift();
        }
    }
    getReloadHistory() {
        return [...this.reloadHistory];
    }
    getStats() {
        const reasonCounts = {};
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
//# sourceMappingURL=ClaudeMdReloader.js.map