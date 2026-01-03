export class ProjectMemoryCleanup {
    knowledgeGraph;
    RETENTION_DAYS = 30;
    constructor(knowledgeGraph) {
        this.knowledgeGraph = knowledgeGraph;
    }
    async cleanupOldMemories() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);
        const memoryTypes = ['code_change', 'test_result', 'session_snapshot'];
        let deletedCount = 0;
        for (const type of memoryTypes) {
            const entities = this.knowledgeGraph.searchEntities({ type: type });
            for (const entity of entities) {
                const timestamp = this.extractTimestamp(entity);
                if (timestamp && timestamp < cutoffDate) {
                    const deleted = this.knowledgeGraph.deleteEntity(entity.name);
                    if (deleted) {
                        deletedCount++;
                    }
                }
            }
        }
        return deletedCount;
    }
    extractTimestamp(entity) {
        const timestampObs = entity.observations?.find(o => o.startsWith('Timestamp:'));
        if (!timestampObs)
            return null;
        const timestampStr = timestampObs.split('Timestamp:')[1]?.trim();
        if (!timestampStr)
            return null;
        const timestamp = new Date(timestampStr);
        if (isNaN(timestamp.getTime()))
            return null;
        return timestamp;
    }
}
//# sourceMappingURL=ProjectMemoryCleanup.js.map