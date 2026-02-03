export class ProjectMemoryManager {
    knowledgeGraph;
    constructor(knowledgeGraph) {
        this.knowledgeGraph = knowledgeGraph;
    }
    async recallRecentWork(options = {}) {
        const { limit = 10, types = ['code_change', 'test_result', 'workflow_checkpoint', 'commit', 'session_snapshot'], } = options;
        const results = [];
        for (const entityType of types) {
            const entities = this.knowledgeGraph.searchEntities({
                entityType,
                limit: Math.ceil(limit / types.length),
            });
            results.push(...entities);
        }
        const sorted = results
            .sort((a, b) => {
            if (!a.createdAt && !b.createdAt)
                return 0;
            if (!a.createdAt)
                return 1;
            if (!b.createdAt)
                return -1;
            return b.createdAt.getTime() - a.createdAt.getTime();
        })
            .slice(0, limit);
        return sorted;
    }
    async search(query, limit = 10) {
        return this.knowledgeGraph.searchEntities({
            namePattern: query,
            limit,
        });
    }
}
//# sourceMappingURL=ProjectMemoryManager.js.map