export class ProjectMemoryManager {
    knowledgeGraph;
    constructor(knowledgeGraph) {
        this.knowledgeGraph = knowledgeGraph;
    }
    async recallRecentWork(options = {}) {
        const { limit = 10, types = ['code_change', 'test_result', 'session_snapshot'], } = options;
        const results = [];
        for (const type of types) {
            const entities = this.knowledgeGraph.searchEntities({
                type: type,
                limit: Math.ceil(limit / types.length),
            });
            results.push(...entities);
        }
        const sorted = results
            .sort((a, b) => {
            const dateA = a.createdAt?.getTime() || 0;
            const dateB = b.createdAt?.getTime() || 0;
            return dateB - dateA;
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