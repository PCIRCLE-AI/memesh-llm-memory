const DEFAULT_OPTIONS = {
    enableTags: true,
    limit: 50,
    types: [],
};
export class EnhancedRetrieval {
    store;
    constructor(store) {
        this.store = store;
    }
    async search(query, options) {
        const opts = { ...DEFAULT_OPTIONS, ...options };
        const results = new Map();
        const exactMatches = await this.exactMatch(query);
        for (const memory of exactMatches) {
            if (this.matchesTypeFilter(memory, opts.types)) {
                results.set(memory.id, {
                    memory,
                    score: 1.0,
                    matchType: 'exact',
                });
            }
        }
        if (opts.enableTags) {
            const tagMatches = await this.tagMatch(query);
            for (const memory of tagMatches) {
                if (this.matchesTypeFilter(memory, opts.types)) {
                    const existing = results.get(memory.id);
                    if (!existing) {
                        results.set(memory.id, {
                            memory,
                            score: 0.8,
                            matchType: 'tag',
                        });
                    }
                }
            }
        }
        const sortedResults = Array.from(results.values()).sort((a, b) => b.score - a.score);
        return sortedResults.slice(0, opts.limit);
    }
    async exactMatch(query) {
        if (!query || query.trim() === '') {
            return [];
        }
        return this.store.search(query);
    }
    async tagMatch(query) {
        if (!query || query.trim() === '') {
            return [];
        }
        const normalizedQuery = query.toLowerCase().trim();
        const matches = await this.store.searchByTags([normalizedQuery]);
        return matches;
    }
    matchesTypeFilter(memory, types) {
        if (!types || types.length === 0) {
            return true;
        }
        return types.includes(memory.type);
    }
}
//# sourceMappingURL=EnhancedRetrieval.js.map