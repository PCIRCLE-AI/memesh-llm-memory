import { logger } from '../utils/logger.js';
export class AutoMemoryRecorder {
    memoryStore;
    importanceThreshold = 0.6;
    constructor(memoryStore) {
        this.memoryStore = memoryStore;
    }
    async recordCodeChange(data) {
        const importance = this.calculateCodeChangeImportance(data);
        if (importance < this.importanceThreshold) {
            logger.debug(`[AutoMemoryRecorder] Skipping code change (importance: ${importance.toFixed(2)})`);
            return null;
        }
        const memory = {
            type: 'experience',
            content: `Code change: ${data.description}`,
            tags: ['code-change', 'auto-recorded'],
            importance,
            timestamp: new Date(),
            metadata: {
                files: data.files,
                linesChanged: data.linesChanged,
            },
        };
        const id = await this.memoryStore.store(memory, {
            projectPath: data.projectPath,
        });
        logger.info(`[AutoMemoryRecorder] Recorded code change: ${id}`);
        return id;
    }
    async recordTestEvent(data) {
        const importance = data.type === 'fail' ? 0.9 : 0.5;
        if (importance < this.importanceThreshold) {
            logger.debug(`[AutoMemoryRecorder] Skipping test ${data.type} (importance: ${importance})`);
            return null;
        }
        const memory = {
            type: data.type === 'fail' ? 'mistake' : 'experience',
            content: data.type === 'fail'
                ? `Test failure: ${data.testName}`
                : `Test passed: ${data.testName}`,
            tags: ['test', 'auto-recorded', data.type === 'fail' ? 'failure' : 'success'],
            importance,
            timestamp: new Date(),
            metadata: {
                testName: data.testName,
                error: data.error,
            },
        };
        const id = await this.memoryStore.store(memory, {
            projectPath: data.projectPath,
        });
        logger.info(`[AutoMemoryRecorder] Recorded test ${data.type}: ${id}`);
        return id;
    }
    async recordGitCommit(data) {
        const importance = this.calculateCommitImportance(data);
        if (importance < this.importanceThreshold) {
            logger.debug(`[AutoMemoryRecorder] Skipping commit (importance: ${importance.toFixed(2)})`);
            return null;
        }
        const memory = {
            type: 'decision',
            content: `Commit: ${data.message}`,
            tags: ['git', 'commit', 'auto-recorded'],
            importance,
            timestamp: new Date(),
            metadata: {
                filesChanged: data.filesChanged,
                insertions: data.insertions,
                deletions: data.deletions,
            },
        };
        const id = await this.memoryStore.store(memory, {
            projectPath: data.projectPath,
        });
        logger.info(`[AutoMemoryRecorder] Recorded commit: ${id}`);
        return id;
    }
    async recordError(data) {
        const memory = {
            type: 'mistake',
            content: `Error: ${data.message}`,
            tags: ['error', 'auto-recorded'],
            importance: 0.95,
            timestamp: new Date(),
            metadata: {
                stack: data.stack,
                context: data.context,
            },
        };
        const id = await this.memoryStore.store(memory, {
            projectPath: data.projectPath,
        });
        logger.info(`[AutoMemoryRecorder] Recorded error: ${id}`);
        return id;
    }
    calculateCodeChangeImportance(data) {
        if (!Array.isArray(data.files)) {
            throw new Error('Invalid files array: must be an array');
        }
        if (data.files.length < 0) {
            throw new Error('Invalid files array: length cannot be negative');
        }
        if (!Number.isFinite(data.linesChanged)) {
            throw new Error(`Invalid linesChanged: must be a finite number, got ${data.linesChanged}`);
        }
        if (data.linesChanged < 0) {
            throw new Error(`Invalid linesChanged: cannot be negative (${data.linesChanged})`);
        }
        if (data.linesChanged > Number.MAX_SAFE_INTEGER) {
            throw new Error(`Invalid linesChanged: exceeds MAX_SAFE_INTEGER (${Number.MAX_SAFE_INTEGER})`);
        }
        let importance = 0.3;
        if (data.files.length > 3) {
            importance += 0.2;
        }
        if (data.linesChanged > 100) {
            importance += 0.3;
        }
        else if (data.linesChanged > 50) {
            importance += 0.2;
        }
        return Math.min(importance, 1.0);
    }
    calculateCommitImportance(data) {
        if (!Number.isFinite(data.filesChanged) || data.filesChanged < 0) {
            throw new Error(`Invalid filesChanged: must be a non-negative finite number, got ${data.filesChanged}`);
        }
        if (!Number.isFinite(data.insertions) || data.insertions < 0) {
            throw new Error(`Invalid insertions: must be a non-negative finite number, got ${data.insertions}`);
        }
        if (!Number.isFinite(data.deletions) || data.deletions < 0) {
            throw new Error(`Invalid deletions: must be a non-negative finite number, got ${data.deletions}`);
        }
        if (data.filesChanged > Number.MAX_SAFE_INTEGER ||
            data.insertions > Number.MAX_SAFE_INTEGER ||
            data.deletions > Number.MAX_SAFE_INTEGER) {
            throw new Error('Commit metrics exceed MAX_SAFE_INTEGER');
        }
        let importance = 0.4;
        if (data.filesChanged > 5) {
            importance += 0.2;
        }
        if (data.insertions + data.deletions > Number.MAX_SAFE_INTEGER) {
            throw new Error(`Total changes (${data.insertions} + ${data.deletions}) would exceed MAX_SAFE_INTEGER`);
        }
        const totalChanges = data.insertions + data.deletions;
        if (totalChanges > 200) {
            importance += 0.3;
        }
        else if (totalChanges > 100) {
            importance += 0.2;
        }
        return Math.min(importance, 1.0);
    }
    setImportanceThreshold(threshold) {
        if (threshold < 0 || threshold > 1) {
            throw new Error('Importance threshold must be between 0 and 1');
        }
        this.importanceThreshold = threshold;
    }
}
//# sourceMappingURL=AutoMemoryRecorder.js.map