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
    async search(query, options = {}) {
        const { limit = 10, projectPath, allProjects = false } = options;
        if (allProjects) {
            return this.knowledgeGraph.searchEntities({
                namePattern: query,
                limit,
            });
        }
        if (projectPath) {
            const projectResults = this.knowledgeGraph.searchEntities({
                namePattern: query,
                tag: 'scope:project',
                limit,
            });
            const globalResults = this.knowledgeGraph.searchEntities({
                namePattern: query,
                tag: 'scope:global',
                limit,
            });
            const merged = new Map();
            for (const entity of [...projectResults, ...globalResults]) {
                if (!merged.has(entity.name)) {
                    merged.set(entity.name, entity);
                }
            }
            return Array.from(merged.values()).slice(0, limit);
        }
        return this.knowledgeGraph.searchEntities({
            namePattern: query,
            limit,
        });
    }
}
//# sourceMappingURL=ProjectMemoryManager.js.map