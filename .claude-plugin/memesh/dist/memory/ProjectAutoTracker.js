import { logger } from '../utils/logger.js';
import { EntityType } from './EntityTypes.js';
export var CheckpointPriority;
(function (CheckpointPriority) {
    CheckpointPriority[CheckpointPriority["NORMAL"] = 1] = "NORMAL";
    CheckpointPriority[CheckpointPriority["IMPORTANT"] = 2] = "IMPORTANT";
    CheckpointPriority[CheckpointPriority["CRITICAL"] = 3] = "CRITICAL";
})(CheckpointPriority || (CheckpointPriority = {}));
export class ProjectAutoTracker {
    mcp;
    snapshotThreshold = 10000;
    currentTokenCount = 0;
    pendingFiles = new Set();
    pendingDescriptions = new Set();
    pendingTimer;
    pendingSince;
    aggregationWindowMs = 2 * 60 * 1000;
    recentMemories = [];
    mergeWindowMs = 5 * 60 * 1000;
    constructor(mcp) {
        this.mcp = mcp;
    }
    getSnapshotThreshold() {
        return this.snapshotThreshold;
    }
    getCurrentTokenCount() {
        return this.currentTokenCount;
    }
    async addTokens(count) {
        this.currentTokenCount += count;
        if (this.currentTokenCount >= this.snapshotThreshold) {
            await this.createSnapshot();
            this.currentTokenCount = 0;
        }
    }
    async recordCodeChange(files, description) {
        const timestamp = new Date().toISOString();
        if (files.length === 0 && !description) {
            return;
        }
        if (!this.pendingSince) {
            this.pendingSince = timestamp;
        }
        for (const file of files) {
            this.pendingFiles.add(file);
        }
        if (description) {
            this.pendingDescriptions.add(description);
        }
        this.schedulePendingFlush();
    }
    async recordTaskStart(data) {
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];
        const observations = [
            `GOAL: ${data.goal}`,
        ];
        if (data.reason) {
            observations.push(`REASON: ${data.reason}`);
        }
        observations.push(`TASK: ${data.task_description}`);
        if (data.expected_outcome) {
            observations.push(`EXPECTED: ${data.expected_outcome}`);
        }
        if (data.priority) {
            observations.push(`PRIORITY: ${data.priority}`);
        }
        observations.push(`Timestamp: ${timestamp}`);
        await this.mcp.memory.createEntities({
            entities: [{
                    name: `Task Started: ${data.goal.substring(0, 50)} - ${dateStr}`,
                    entityType: EntityType.TASK_START,
                    observations,
                }],
        });
    }
    async recordDecision(data) {
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];
        const observations = [
            `DECISION: ${data.decision_description}`,
            `CONTEXT: ${data.context}`,
        ];
        if (data.options_considered && data.options_considered.length > 0) {
            observations.push(`OPTIONS CONSIDERED: ${data.options_considered.join(', ')}`);
        }
        observations.push(`CHOSEN: ${data.chosen_option}`);
        observations.push(`RATIONALE: ${data.rationale}`);
        if (data.trade_offs) {
            observations.push(`TRADE-OFFS: ${data.trade_offs}`);
        }
        if (data.confidence) {
            observations.push(`CONFIDENCE: ${data.confidence}`);
        }
        observations.push(`Timestamp: ${timestamp}`);
        await this.mcp.memory.createEntities({
            entities: [{
                    name: `Decision: ${data.chosen_option.substring(0, 50)} - ${dateStr}`,
                    entityType: EntityType.DECISION,
                    observations,
                }],
        });
    }
    async recordProgressMilestone(data) {
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];
        const observations = [
            `MILESTONE: ${data.milestone_description}`,
            `SIGNIFICANCE: ${data.significance}`,
        ];
        if (data.impact) {
            observations.push(`IMPACT: ${data.impact}`);
        }
        if (data.learnings) {
            observations.push(`LEARNINGS: ${data.learnings}`);
        }
        if (data.next_steps) {
            observations.push(`NEXT STEPS: ${data.next_steps}`);
        }
        observations.push(`Timestamp: ${timestamp}`);
        await this.mcp.memory.createEntities({
            entities: [{
                    name: `Milestone: ${data.milestone_description.substring(0, 50)} - ${dateStr}`,
                    entityType: EntityType.PROGRESS_MILESTONE,
                    observations,
                }],
        });
    }
    async recordError(data) {
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];
        const observations = [
            `ERROR TYPE: ${data.error_type}`,
            `MESSAGE: ${data.error_message}`,
            `CONTEXT: ${data.context}`,
        ];
        if (data.root_cause) {
            observations.push(`ROOT CAUSE: ${data.root_cause}`);
        }
        observations.push(`RESOLUTION: ${data.resolution}`);
        if (data.prevention) {
            observations.push(`PREVENTION: ${data.prevention}`);
        }
        observations.push(`Timestamp: ${timestamp}`);
        await this.mcp.memory.createEntities({
            entities: [{
                    name: `Error Resolution: ${data.error_type} - ${dateStr}`,
                    entityType: EntityType.ERROR_RESOLUTION,
                    observations,
                }],
        });
    }
    async recordTestResult(result) {
        await this.flushPendingCodeChanges('test-complete');
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];
        const status = result.failed === 0 ? 'PASS' : 'FAIL';
        const observations = [
            `Status: ${status}`,
            `Tests passed: ${result.passed}/${result.total}`,
        ];
        if (result.failed > 0) {
            observations.push(`Tests failed: ${result.failed}`);
            observations.push('Failures:');
            observations.push(...result.failures.map(f => `  - ${f}`));
        }
        observations.push(`Timestamp: ${timestamp}`);
        await this.mcp.memory.createEntities({
            entities: [{
                    name: `Test Result ${status} ${dateStr} ${Date.now()}`,
                    entityType: EntityType.TEST_RESULT,
                    observations,
                }],
        });
    }
    async recordWorkflowCheckpoint(checkpoint, details = []) {
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];
        await this.mcp.memory.createEntities({
            entities: [{
                    name: `Workflow Checkpoint ${checkpoint} ${dateStr} ${Date.now()}`,
                    entityType: EntityType.WORKFLOW_CHECKPOINT,
                    observations: [
                        `Checkpoint: ${checkpoint}`,
                        ...details,
                        `Timestamp: ${timestamp}`,
                    ],
                }],
        });
    }
    async recordCommit(details) {
        await this.flushPendingCodeChanges('commit');
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];
        const observations = [];
        if (details.message) {
            observations.push(`Message: ${details.message}`);
        }
        if (details.command) {
            observations.push(`Command: ${details.command}`);
        }
        if (details.output) {
            const lines = details.output.split('\n').map(line => line.trim()).filter(Boolean);
            const preview = lines.slice(0, 5);
            if (preview.length > 0) {
                observations.push('Output:');
                preview.forEach(line => observations.push(`  - ${line}`));
                if (lines.length > preview.length) {
                    observations.push(`  - ...and ${lines.length - preview.length} more lines`);
                }
            }
        }
        observations.push(`Timestamp: ${timestamp}`);
        await this.mcp.memory.createEntities({
            entities: [{
                    name: `Commit ${dateStr} ${Date.now()}`,
                    entityType: EntityType.COMMIT,
                    observations,
                }],
        });
    }
    async createSnapshot() {
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];
        await this.mcp.memory.createEntities({
            entities: [{
                    name: `Project Snapshot ${dateStr} ${Date.now()}`,
                    entityType: EntityType.PROJECT_SNAPSHOT,
                    observations: [
                        `Token count: ${this.currentTokenCount}`,
                        `Snapshot threshold: ${this.snapshotThreshold}`,
                        'Snapshot reason: Token threshold reached',
                        `Timestamp: ${timestamp}`,
                    ],
                }],
        });
    }
    async flushPendingCodeChanges(reason) {
        if (this.pendingFiles.size === 0 && this.pendingDescriptions.size === 0) {
            return;
        }
        if (this.pendingTimer) {
            clearTimeout(this.pendingTimer);
            this.pendingTimer = undefined;
        }
        const timestamp = new Date().toISOString();
        const dateStr = timestamp.split('T')[0];
        const files = Array.from(this.pendingFiles);
        const descriptions = Array.from(this.pendingDescriptions);
        if (files.length === 0) {
            this.clearPendingState();
            return;
        }
        this.cleanupOldMemories();
        const priority = this.getPriorityForCheckpoint(reason);
        if (this.shouldSkipDueToRecent(files, priority)) {
            this.clearPendingState();
            return;
        }
        const observations = [
            `Files modified: ${files.length}`,
            ...files.slice(0, ProjectAutoTracker.MAX_FILES_IN_OBSERVATION).map(file => `  - ${file}`),
        ];
        if (files.length > ProjectAutoTracker.MAX_FILES_IN_OBSERVATION) {
            observations.push(`  - ...and ${files.length - ProjectAutoTracker.MAX_FILES_IN_OBSERVATION} more`);
        }
        if (descriptions.length === 1) {
            observations.push(`Description: ${descriptions[0]}`);
        }
        else if (descriptions.length > 1) {
            observations.push('Descriptions:');
            descriptions.forEach(desc => observations.push(`  - ${desc}`));
        }
        if (this.pendingSince) {
            observations.push(`First change: ${this.pendingSince}`);
        }
        observations.push(`Last change: ${timestamp}`);
        observations.push(`Reason: ${reason}`);
        const entityName = `Code Change ${dateStr} ${Date.now()}`;
        await this.mcp.memory.createEntities({
            entities: [{
                    name: entityName,
                    entityType: EntityType.CODE_CHANGE,
                    observations,
                }],
        });
        this.recentMemories.push({
            entityName,
            files,
            timestamp: new Date(),
            priority,
        });
        this.clearPendingState();
    }
    shouldSkipDueToRecent(files, priority = CheckpointPriority.NORMAL) {
        if (this.mergeWindowMs === 0) {
            return false;
        }
        const now = Date.now();
        const cutoff = now - this.mergeWindowMs;
        const mostRecentOverlap = this.recentMemories.reduce((latest, m) => {
            if (m.timestamp.getTime() <= cutoff)
                return latest;
            if (!files.some(f => m.files.includes(f)))
                return latest;
            if (!latest || m.timestamp.getTime() > latest.timestamp.getTime()) {
                return m;
            }
            return latest;
        }, null);
        if (!mostRecentOverlap) {
            return false;
        }
        const age = now - mostRecentOverlap.timestamp.getTime();
        const shouldSkip = priority <= mostRecentOverlap.priority;
        if (shouldSkip) {
            logger.info(`Skipping memory creation - most recent overlapping memory "${mostRecentOverlap.entityName}" ` +
                `(priority=${mostRecentOverlap.priority}) contains these files (${age}ms ago). ` +
                `Current priority=${priority}`);
        }
        else {
            logger.info(`Allowing memory creation - current priority (${priority}) ` +
                `higher than most recent overlapping memory "${mostRecentOverlap.entityName}" ` +
                `(priority=${mostRecentOverlap.priority}, ${age}ms ago)`);
        }
        return shouldSkip;
    }
    cleanupOldMemories() {
        if (this.mergeWindowMs === 0) {
            this.recentMemories = [];
            return;
        }
        const cutoff = Date.now() - this.mergeWindowMs;
        const beforeCount = this.recentMemories.length;
        this.recentMemories = this.recentMemories.filter(m => m.timestamp.getTime() > cutoff);
        const cleaned = beforeCount - this.recentMemories.length;
        if (cleaned > 0) {
            logger.debug(`Cleaned up ${cleaned} old memory records`);
        }
    }
    clearPendingState() {
        this.pendingFiles.clear();
        this.pendingDescriptions.clear();
        this.pendingSince = undefined;
    }
    static MAX_FILES_IN_OBSERVATION = 20;
    static CHECKPOINT_PRIORITIES = new Map([
        ['test-complete', CheckpointPriority.CRITICAL],
        ['committed', CheckpointPriority.CRITICAL],
        ['build-complete', CheckpointPriority.CRITICAL],
        ['commit-ready', CheckpointPriority.IMPORTANT],
        ['deploy-ready', CheckpointPriority.IMPORTANT],
    ]);
    getPriorityForCheckpoint(checkpoint) {
        return ProjectAutoTracker.CHECKPOINT_PRIORITIES.get(checkpoint) ?? CheckpointPriority.NORMAL;
    }
    schedulePendingFlush() {
        if (this.pendingTimer) {
            clearTimeout(this.pendingTimer);
        }
        this.pendingTimer = setTimeout(() => {
            this.flushPendingCodeChanges('idle-window').catch(error => {
                logger.warn('Failed to flush pending code changes:', error);
            });
        }, this.aggregationWindowMs);
        if (this.pendingTimer && typeof this.pendingTimer.unref === 'function') {
            this.pendingTimer.unref();
        }
    }
    createFileChangeHook() {
        return async (files, description) => {
            await this.recordCodeChange(files, description);
        };
    }
    createTestResultHook() {
        return async (result) => {
            await this.recordTestResult(result);
        };
    }
    createTokenHook() {
        return async (count) => {
            await this.addTokens(count);
        };
    }
}
//# sourceMappingURL=ProjectAutoTracker.js.map