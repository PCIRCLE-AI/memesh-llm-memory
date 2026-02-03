import { logger } from '../utils/logger.js';
const DEFAULT_CONFIG = {
    decayRate: 0.1,
    minImportance: 0.5,
    maxAgeDays: Infinity,
    minOccurrences: 1,
};
export class MistakePatternManager {
    memoryStore;
    config;
    constructor(memoryStore, config) {
        this.memoryStore = memoryStore;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    async extractPatterns(phase) {
        const mistakes = await this.memoryStore.searchByType('mistake', {
            minImportance: this.config.minImportance,
        });
        const relevantMistakes = phase
            ? mistakes.filter(m => this.isRelevantToPhase(m, phase))
            : mistakes;
        const patternGroups = this.groupBySimilarity(relevantMistakes);
        const patterns = [];
        for (const [signature, group] of patternGroups.entries()) {
            const pattern = this.createPattern(signature, group);
            pattern.weight = this.calculateWeight(pattern);
            patterns.push(pattern);
        }
        patterns.sort((a, b) => b.weight - a.weight);
        return patterns;
    }
    isRelevantToPhase(mistake, phase) {
        if (mistake.tags?.includes(phase)) {
            return true;
        }
        if (mistake.metadata?.phase === phase) {
            return true;
        }
        const phaseKeywords = {
            'code-written': ['test', 'validation', 'verify', 'check'],
            'test-complete': ['commit', 'review', 'merge', 'approve'],
            'commit-ready': ['push', 'deploy', 'release', 'publish'],
        };
        const keywords = phaseKeywords[phase] || [];
        const contentLower = mistake.content.toLowerCase();
        return keywords.some(keyword => contentLower.includes(keyword));
    }
    groupBySimilarity(mistakes) {
        const groups = new Map();
        for (const mistake of mistakes) {
            const signature = this.generateSignature(mistake);
            if (!groups.has(signature)) {
                groups.set(signature, []);
            }
            groups.get(signature).push(mistake);
        }
        for (const [signature, group] of groups.entries()) {
            if (group.length < this.config.minOccurrences) {
                groups.delete(signature);
            }
        }
        return groups;
    }
    generateSignature(mistake) {
        const errorType = mistake.metadata?.errorType || 'unknown';
        const words = mistake.content
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 3)
            .slice(0, 5);
        const phase = mistake.metadata?.phase || 'general';
        return `${errorType}:${phase}:${words.join('-')}`;
    }
    createPattern(signature, mistakes) {
        const avgImportance = mistakes.length > 0
            ? mistakes.reduce((sum, m) => sum + m.importance, 0) / mistakes.length
            : 0.5;
        const occurrences = mistakes.map(m => m.timestamp);
        const phases = new Set();
        for (const m of mistakes) {
            if (m.metadata?.phase) {
                phases.add(m.metadata.phase);
            }
        }
        const latest = mistakes.reduce((latest, m) => m.timestamp > latest.timestamp ? m : latest);
        return {
            id: signature,
            category: latest.metadata?.errorType || 'unknown',
            description: latest.content,
            baseImportance: avgImportance,
            occurrenceCount: mistakes.length,
            occurrences,
            weight: 0,
            relatedPhases: Array.from(phases),
            prevention: latest.metadata?.preventionMethod || 'Review carefully',
        };
    }
    calculateWeight(pattern) {
        const { baseImportance, occurrenceCount, occurrences } = pattern;
        const repetitionFactor = Math.log(1 + occurrenceCount);
        const now = new Date();
        const lastOccurrence = occurrences[occurrences.length - 1];
        const timeDiff = now.getTime() - lastOccurrence.getTime();
        if (timeDiff < 0) {
            logger.warn('[MistakePatternManager] Invalid timestamp: lastOccurrence in future', {
                lastOccurrence,
                now,
            });
            return 0;
        }
        const daysSinceLast = timeDiff / (1000 * 60 * 60 * 24);
        const decayRate = this.config.decayRate || 0.01;
        if (!Number.isFinite(decayRate) || decayRate <= 0) {
            logger.warn('[MistakePatternManager] Invalid decayRate', {
                decayRate: this.config.decayRate,
            });
            return 0.5;
        }
        const recencyFactor = 1 / (1 + daysSinceLast * decayRate);
        if (!Number.isFinite(recencyFactor)) {
            logger.warn('[MistakePatternManager] Invalid recencyFactor calculation', {
                daysSinceLast,
                decayRate,
                recencyFactor,
            });
            return 0.5;
        }
        const weight = baseImportance * repetitionFactor * recencyFactor;
        return Math.min(weight, 1.0);
    }
    async getTopPatterns(phase, limit = 5) {
        const patterns = await this.extractPatterns(phase);
        return patterns.slice(0, limit);
    }
}
//# sourceMappingURL=MistakePatternManager.js.map