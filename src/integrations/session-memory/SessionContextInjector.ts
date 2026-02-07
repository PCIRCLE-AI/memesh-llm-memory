/**
 * SessionContextInjector
 *
 * Queries the KnowledgeGraph at session start to provide relevant context
 * (past lessons, best practices, prevention rules, decisions) to a new
 * Claude Code session. Designed to be called from a SessionStart hook.
 *
 * All KG queries are synchronous (backed by better-sqlite3). The injector
 * produces a formatted text block suitable for injection into the session
 * system prompt.
 */

import type { KnowledgeGraph } from '../../knowledge-graph/index.js';
import type { Entity, EntityType } from '../../knowledge-graph/types.js';
import { AUTO_TAGS } from './types.js';
import { logger } from '../../utils/logger.js';

// ─── Configuration Types ────────────────────────────────────────────

export interface InjectionConfig {
  /** Maximum items per section (default: 5) */
  maxItemsPerSection?: number;
  /** Approximate maximum output characters (default: 4000) */
  maxOutputChars?: number;
}

export interface InjectionContext {
  /** Current project path */
  projectPath?: string;
  /** Current git branch name */
  gitBranch?: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_MAX_ITEMS_PER_SECTION = 5;
const DEFAULT_MAX_OUTPUT_CHARS = 4000;
const MAX_ITEM_DISPLAY_CHARS = 200;

/** Observation prefixes considered metadata (skipped when extracting display text) */
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

// ─── SessionContextInjector ─────────────────────────────────────────

export class SessionContextInjector {
  private maxItemsPerSection: number;
  private maxOutputChars: number;

  constructor(
    private knowledgeGraph: KnowledgeGraph,
    private config: InjectionConfig = {},
  ) {
    this.maxItemsPerSection = config.maxItemsPerSection ?? DEFAULT_MAX_ITEMS_PER_SECTION;
    this.maxOutputChars = config.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
  }

  /**
   * Generate context string for injection into a new session.
   * Returns empty string if no relevant context found or on error.
   */
  generateContext(ctx: InjectionContext = {}): string {
    try {
      const limit = this.maxItemsPerSection;

      // Query each section
      const lessons = this.getLessons(limit);
      const preventionRules = this.getPreventionRules(limit);
      const bestPractices = this.getBestPractices(limit);
      const decisions = this.getDecisions(ctx.gitBranch, limit);
      const recentSessions = this.getRecentSessions(limit);

      // Format each populated section
      const sections: string[] = [];

      const lessonsSection = this.formatSection(
        'Past Lessons',
        '\u26A0\uFE0F',
        lessons,
        (e) => this.extractDisplayText(e),
      );
      if (lessonsSection) sections.push(lessonsSection);

      const rulesSection = this.formatSection(
        'Prevention Rules',
        '\uD83D\uDEE1\uFE0F',
        preventionRules,
        (e) => this.extractDisplayText(e),
      );
      if (rulesSection) sections.push(rulesSection);

      const practicesSection = this.formatSection(
        'Best Practices',
        '\u2705',
        bestPractices,
        (e) => this.extractDisplayText(e),
      );
      if (practicesSection) sections.push(practicesSection);

      const decisionsSection = this.formatSection(
        'Relevant Decisions',
        '\uD83D\uDCCB',
        decisions,
        (e) => this.extractDisplayText(e),
      );
      if (decisionsSection) sections.push(decisionsSection);

      const sessionsSection = this.formatSection(
        'Recent Sessions',
        '\uD83D\uDCDD',
        recentSessions,
        (e) => this.extractSessionTitle(e),
      );
      if (sessionsSection) sections.push(sessionsSection);

      // Return empty if no sections
      if (sections.length === 0) {
        return '';
      }

      return this.formatBanner(sections);
    } catch (error) {
      logger.warn('[SessionContextInjector] Failed to generate context:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return '';
    }
  }

  // ─── Query Methods ──────────────────────────────────────────────

  private getLessons(limit: number): Entity[] {
    return this.safeSearch({ entityType: 'lesson_learned', tag: AUTO_TAGS.SOURCE, limit });
  }

  private getBestPractices(limit: number): Entity[] {
    return this.safeSearch({ entityType: 'best_practice', tag: AUTO_TAGS.SOURCE, limit });
  }

  private getPreventionRules(limit: number): Entity[] {
    return this.safeSearch({ entityType: 'prevention_rule', tag: AUTO_TAGS.SOURCE, limit });
  }

  private getDecisions(gitBranch: string | undefined, limit: number): Entity[] {
    if (gitBranch) {
      // Extract meaningful terms from branch name for FTS5 search
      // e.g. "feature/session-memory-integration" -> "session-memory-integration"
      const branchTerms = this.extractBranchTerms(gitBranch);
      if (branchTerms) {
        return this.safeSearch({
          entityType: 'decision',
          namePattern: branchTerms,
          limit,
        });
      }
    }

    // Fallback: get recent decisions with source tag
    return this.safeSearch({ entityType: 'decision', tag: AUTO_TAGS.SOURCE, limit });
  }

  private getRecentSessions(limit: number): Entity[] {
    return this.safeSearch({ entityType: 'session_snapshot', tag: AUTO_TAGS.SOURCE, limit });
  }

  // ─── Formatting Methods ─────────────────────────────────────────

  /**
   * Format a section with title, icon, and bulleted entity list.
   * Returns empty string if entities array is empty.
   */
  private formatSection(
    title: string,
    emoji: string,
    entities: Entity[],
    extractor: (e: Entity) => string,
  ): string {
    if (!entities || entities.length === 0) {
      return '';
    }

    // Limit to maxItemsPerSection
    const limited = entities.slice(0, this.maxItemsPerSection);

    const items = limited
      .map((e) => {
        const text = extractor(e);
        if (!text) return null;
        const truncated = this.truncateText(text, MAX_ITEM_DISPLAY_CHARS);
        return `- ${truncated}`;
      })
      .filter((item): item is string => item !== null);

    if (items.length === 0) {
      return '';
    }

    return `## ${emoji} ${title}\n${items.join('\n')}`;
  }

  /**
   * Wrap sections in a banner block and apply character limit.
   */
  private formatBanner(sections: string[]): string {
    const header = [
      BANNER_LINE,
      '  \uD83E\uDDE0 MeMesh Enhanced Context (from Knowledge Graph)',
      BANNER_LINE,
    ].join('\n');

    const footer = BANNER_LINE;
    // Overhead: header + \n\n + \n\n + footer
    const overhead = header.length + footer.length + 4;

    // Build body by adding sections until budget is reached
    const includedSections: string[] = [];
    let currentLength = overhead;

    for (const section of sections) {
      const separator = includedSections.length > 0 ? 2 : 0; // \n\n between sections
      const addition = section.length + separator;
      if (currentLength + addition > this.maxOutputChars) break;
      includedSections.push(section);
      currentLength += addition;
    }

    if (includedSections.length === 0) {
      // Even first section exceeds budget — include truncated
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

  // ─── Extraction Helpers ─────────────────────────────────────────

  /**
   * Extract the first meaningful observation text from an entity,
   * skipping metadata-like observations.
   */
  private extractDisplayText(entity: Entity): string {
    if (!entity.observations || entity.observations.length === 0) {
      return '';
    }

    for (const obs of entity.observations) {
      // Skip metadata-like observations
      const isMetadata = METADATA_PREFIXES.some((prefix) =>
        obs.trim().toLowerCase().startsWith(prefix.toLowerCase()),
      );
      if (isMetadata) {
        continue;
      }

      // Return the first non-metadata observation
      return obs.trim();
    }

    // If all observations are metadata, return the first one anyway
    return entity.observations[0].trim();
  }

  /**
   * Extract session title from a session_snapshot entity.
   * Looks for "title: ..." observation pattern.
   */
  private extractSessionTitle(entity: Entity): string {
    if (!entity.observations || entity.observations.length === 0) {
      return entity.name;
    }

    for (const obs of entity.observations) {
      if (obs.startsWith('title: ')) {
        return obs.substring('title: '.length).trim();
      }
    }

    // Fallback to generic display text
    return this.extractDisplayText(entity) || entity.name;
  }

  /**
   * Extract meaningful search terms from a git branch name.
   * Strips common prefixes (feature/, bugfix/, hotfix/) and returns
   * the descriptive part for FTS5 matching.
   */
  private extractBranchTerms(branch: string): string {
    // Remove common branch prefixes
    const cleaned = branch
      .replace(/^(feature|bugfix|hotfix|fix|release|chore)\//i, '')
      .trim();

    if (!cleaned) {
      return '';
    }

    // Strip non-alphanumeric chars to prevent FTS5 operator injection,
    // then collapse whitespace for clean tokenization
    return cleaned.replace(/[^a-zA-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // ─── Utility ────────────────────────────────────────────────────

  /**
   * Safe wrapper around searchEntities that catches errors and returns empty array.
   */
  private safeSearch(query: {
    entityType?: EntityType;
    tag?: string;
    namePattern?: string;
    limit?: number;
  }): Entity[] {
    try {
      const results = this.knowledgeGraph.searchEntities(query);
      // Guard against undefined/null returns
      return Array.isArray(results) ? results : [];
    } catch (error) {
      logger.warn('[SessionContextInjector] Search failed:', {
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Truncate text to a maximum length, adding ellipsis if needed.
   */
  private truncateText(text: string, maxLength: number): string {
    if (maxLength <= 0) return '';
    if (text.length <= maxLength) return text;
    if (maxLength <= 3) return text.substring(0, maxLength);
    return text.substring(0, maxLength - 3) + '...';
  }
}
