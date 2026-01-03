export class ProjectAutoTracker {
    mcp;
    snapshotThreshold = 10000;
    currentTokenCount = 0;
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
        const dateStr = timestamp.split('T')[0];
        await this.mcp.memory.createEntities({
            entities: [{
                    name: `Code Change ${dateStr} ${Date.now()}`,
                    entityType: 'code_change',
                    observations: [
                        `Files modified: ${files.length}`,
                        ...files.map(f => `  - ${f}`),
                        `Description: ${description}`,
                        `Timestamp: ${timestamp}`,
                    ],
                }],
        });
    }
    async recordTestResult(result) {
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
                    entityType: 'test_result',
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
                    entityType: 'project_snapshot',
                    observations: [
                        `Token count: ${this.currentTokenCount}`,
                        `Snapshot threshold: ${this.snapshotThreshold}`,
                        'Snapshot reason: Token threshold reached',
                        `Timestamp: ${timestamp}`,
                    ],
                }],
        });
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