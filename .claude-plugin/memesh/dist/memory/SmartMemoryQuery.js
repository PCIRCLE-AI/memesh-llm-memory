export class SmartMemoryQuery {
    search(query, memories, options) {
        if (!query || query.trim() === '') {
            return memories;
        }
        const queryLower = query.toLowerCase();
        const techStack = options?.techStack || [];
        const scored = memories.map(memory => ({
            memory,
            score: this.calculateRelevanceScore(memory, queryLower, techStack),
        }));
        return scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.memory);
    }
    calculateRelevanceScore(memory, queryLower, techStack) {
        let importance = memory.importance;
        if (importance === undefined || importance === null) {
            importance = 0.5;
        }
        if (!Number.isFinite(importance)) {
            console.warn(`[SmartMemoryQuery] Invalid importance value: ${importance}, using 0.5`);
            importance = 0.5;
        }
        if (importance < 0 || importance > 1) {
            console.warn(`[SmartMemoryQuery] Importance out of range [0,1]: ${importance}, clamping`);
            importance = Math.max(0, Math.min(1, importance));
        }
        importance = Math.max(importance, 0.01);
        let score = 0;
        const contentLower = memory.content.toLowerCase();
        const tags = memory.tags || [];
        if (contentLower.includes(queryLower)) {
            score += 100;
            const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
            const contentWords = contentLower.split(/\s+/).filter(w => w.length > 0);
            const termFrequency = queryWords.reduce((freq, word) => {
                return freq + contentWords.filter(cw => cw.includes(word)).length;
            }, 0);
            score += Math.min(termFrequency * 5, 20);
        }
        const matchingTags = tags.filter(tag => tag.toLowerCase().includes(queryLower) ||
            queryLower.includes(tag.toLowerCase()));
        const tagScore = Math.min(matchingTags.length * 50, 200);
        score += tagScore;
        if (score === 0) {
            return 0;
        }
        const hasTechMatch = tags.some(tag => techStack.some(tech => tag.toLowerCase().includes(tech.toLowerCase())));
        if (hasTechMatch && techStack.length > 0) {
            score *= 1.5;
        }
        score *= importance;
        const daysSinceCreation = (Date.now() - memory.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation < 7) {
            score *= 1.2;
        }
        else if (daysSinceCreation < 30) {
            score *= 1.1;
        }
        return score;
    }
}
//# sourceMappingURL=SmartMemoryQuery.js.map