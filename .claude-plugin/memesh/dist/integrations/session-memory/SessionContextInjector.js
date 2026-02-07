import { AUTO_TAGS } from './types.js';
import { logger } from '../../utils/logger.js';
const DEFAULT_MAX_ITEMS_PER_SECTION = 5;
const DEFAULT_MAX_OUTPUT_CHARS = 4000;
const MAX_ITEM_DISPLAY_CHARS = 200;
const METADATA_PREFIXES = [
    'source_session:',
    'source_project:',
    'ingested_at:',
    'session_id:',
    'project_path:',
    'sanitized_path:',
    'change_type:',
];
const BANNER_LINE = '════════════════════════════════════════════════════════════';
export class SessionContextInjector {
    knowledgeGraph;
    config;
    maxItemsPerSection;
    maxOutputChars;
    constructor(knowledgeGraph, config = {}) {
        this.knowledgeGraph = knowledgeGraph;
        this.config = config;
        this.maxItemsPerSection = config.maxItemsPerSection ?? DEFAULT_MAX_ITEMS_PER_SECTION;
        this.maxOutputChars = config.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
    }
    generateContext(ctx = {}) {
        try {
            const limit = this.maxItemsPerSection;
            const lessons = this.getLessons(limit);
            const preventionRules = this.getPreventionRules(limit);
            const bestPractices = this.getBestPractices(limit);
            const decisions = this.getDecisions(ctx.gitBranch, limit);
            const recentSessions = this.getRecentSessions(limit);
            const sections = [];
            const lessonsSection = this.formatSection('Past Lessons', '\u26A0\uFE0F', lessons, (e) => this.extractDisplayText(e));
            if (lessonsSection)
                sections.push(lessonsSection);
            const rulesSection = this.formatSection('Prevention Rules', '\uD83D\uDEE1\uFE0F', preventionRules, (e) => this.extractDisplayText(e));
            if (rulesSection)
                sections.push(rulesSection);
            const practicesSection = this.formatSection('Best Practices', '\u2705', bestPractices, (e) => this.extractDisplayText(e));
            if (practicesSection)
                sections.push(practicesSection);
            const decisionsSection = this.formatSection('Relevant Decisions', '\uD83D\uDCCB', decisions, (e) => this.extractDisplayText(e));
            if (decisionsSection)
                sections.push(decisionsSection);
            const sessionsSection = this.formatSection('Recent Sessions', '\uD83D\uDCDD', recentSessions, (e) => this.extractSessionTitle(e));
            if (sessionsSection)
                sections.push(sessionsSection);
            if (sections.length === 0) {
                return '';
            }
            return this.formatBanner(sections);
        }
        catch (error) {
            logger.warn('[SessionContextInjector] Failed to generate context:', {
                error: error instanceof Error ? error.message : String(error),
            });
            return '';
        }
    }
    getLessons(limit) {
        return this.safeSearch({ entityType: 'lesson_learned', tag: AUTO_TAGS.SOURCE, limit });
    }
    getBestPractices(limit) {
        return this.safeSearch({ entityType: 'best_practice', tag: AUTO_TAGS.SOURCE, limit });
    }
    getPreventionRules(limit) {
        return this.safeSearch({ entityType: 'prevention_rule', tag: AUTO_TAGS.SOURCE, limit });
    }
    getDecisions(gitBranch, limit) {
        if (gitBranch) {
            const branchTerms = this.extractBranchTerms(gitBranch);
            if (branchTerms) {
                return this.safeSearch({
                    entityType: 'decision',
                    namePattern: branchTerms,
                    limit,
                });
            }
        }
        return this.safeSearch({ entityType: 'decision', tag: AUTO_TAGS.SOURCE, limit });
    }
    getRecentSessions(limit) {
        return this.safeSearch({ entityType: 'session_snapshot', tag: AUTO_TAGS.SOURCE, limit });
    }
    formatSection(title, emoji, entities, extractor) {
        if (!entities || entities.length === 0) {
            return '';
        }
        const limited = entities.slice(0, this.maxItemsPerSection);
        const items = limited
            .map((e) => {
            const text = extractor(e);
            if (!text)
                return null;
            const truncated = this.truncateText(text, MAX_ITEM_DISPLAY_CHARS);
            return `- ${truncated}`;
        })
            .filter((item) => item !== null);
        if (items.length === 0) {
            return '';
        }
        return `## ${emoji} ${title}\n${items.join('\n')}`;
    }
    formatBanner(sections) {
        const header = [
            BANNER_LINE,
            '  \uD83E\uDDE0 MeMesh Enhanced Context (from Knowledge Graph)',
            BANNER_LINE,
        ].join('\n');
        const footer = BANNER_LINE;
        const overhead = header.length + footer.length + 4;
        const includedSections = [];
        let currentLength = overhead;
        for (const section of sections) {
            const separator = includedSections.length > 0 ? 2 : 0;
            const addition = section.length + separator;
            if (currentLength + addition > this.maxOutputChars)
                break;
            includedSections.push(section);
            currentLength += addition;
        }
        if (includedSections.length === 0) {
            const availableChars = this.maxOutputChars - overhead;
            if (availableChars > 10 && sections.length > 0) {
                const truncated = sections[0].substring(0, availableChars - 4) + '\n...';
                return `${header}\n\n${truncated}\n\n${footer}`;
            }
            return '';
        }
        const body = includedSections.join('\n\n');
        return `${header}\n\n${body}\n\n${footer}`;
    }
    extractDisplayText(entity) {
        if (!entity.observations || entity.observations.length === 0) {
            return '';
        }
        for (const obs of entity.observations) {
            const isMetadata = METADATA_PREFIXES.some((prefix) => obs.trim().toLowerCase().startsWith(prefix.toLowerCase()));
            if (isMetadata) {
                continue;
            }
            return obs.trim();
        }
        return entity.observations[0].trim();
    }
    extractSessionTitle(entity) {
        if (!entity.observations || entity.observations.length === 0) {
            return entity.name;
        }
        for (const obs of entity.observations) {
            if (obs.startsWith('title: ')) {
                return obs.substring('title: '.length).trim();
            }
        }
        return this.extractDisplayText(entity) || entity.name;
    }
    extractBranchTerms(branch) {
        const cleaned = branch
            .replace(/^(feature|bugfix|hotfix|fix|release|chore)\//i, '')
            .trim();
        if (!cleaned) {
            return '';
        }
        return cleaned.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    safeSearch(query) {
        try {
            const results = this.knowledgeGraph.searchEntities(query);
            return Array.isArray(results) ? results : [];
        }
        catch (error) {
            logger.warn('[SessionContextInjector] Search failed:', {
                query,
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }
    truncateText(text, maxLength) {
        if (maxLength <= 0)
            return '';
        if (text.length <= maxLength)
            return text;
        if (maxLength <= 3)
            return text.substring(0, maxLength);
        return text.substring(0, maxLength - 3) + '...';
    }
}
//# sourceMappingURL=SessionContextInjector.js.map