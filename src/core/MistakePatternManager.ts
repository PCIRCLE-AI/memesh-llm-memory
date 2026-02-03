/**
 * Mistake Pattern Manager
 *
 * Manages mistake patterns for workflow guidance with:
 * - Importance-based weighting
 * - Decay mechanism based on repetition rate
 * - Reinforcement for repeated mistakes
 * - Pattern-only storage (no detailed content)
 *
 * Key Algorithm:
 * - Pattern Weight = base_importance * repetition_factor * recency_factor
 * - Repetition Factor = log(1 + occurrence_count)
 * - Recency Factor = 1 / (1 + days_since_last * decay_rate)
 */

import type { UnifiedMemoryStore } from '../memory/UnifiedMemoryStore.js';
import type { UnifiedMemory } from '../memory/types/unified-memory.js';
import { logger } from '../utils/logger.js';

/**
 * Mistake pattern extracted from multiple similar mistakes
 */
export interface MistakePattern {
  /** Pattern ID (hash of pattern signature) */
  id: string;

  /** Pattern category (workflow phase or error type) */
  category: string;

  /** Pattern description (what went wrong) */
  description: string;

  /** Base importance (0-1) from original mistakes */
  baseImportance: number;

  /** Number of times this pattern occurred */
  occurrenceCount: number;

  /** Timestamps of all occurrences */
  occurrences: Date[];

  /** Calculated pattern weight (considering repetition + recency) */
  weight: number;

  /** Related workflow phases */
  relatedPhases: string[];

  /** Prevention suggestion */
  prevention: string;
}

/**
 * Configuration for pattern extraction and weighting
 */
export interface PatternConfig {
  /** Decay rate for recency (default: 0.1) */
  decayRate?: number;

  /** Minimum importance to consider (default: 0.5) */
  minImportance?: number;

  /** Maximum pattern age in days (default: Infinity, keep all) */
  maxAgeDays?: number;

  /** Minimum occurrences to form a pattern (default: 1) */
  minOccurrences?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<PatternConfig> = {
  decayRate: 0.1,
  minImportance: 0.5,
  maxAgeDays: Infinity, // Keep all mistakes as per user requirement
  minOccurrences: 1,
};

/**
 * Mistake Pattern Manager
 *
 * Extracts and manages mistake patterns from the unified memory store.
 * Implements importance-based weighting with decay and reinforcement mechanisms.
 *
 * @example
 * ```typescript
 * const manager = new MistakePatternManager(memoryStore);
 *
 * // Extract patterns for a workflow phase
 * const patterns = await manager.extractPatterns('code-written');
 *
 * // Get high-weight patterns
 * const topPatterns = patterns
 *   .filter(p => p.weight > 0.7)
 *   .sort((a, b) => b.weight - a.weight)
 *   .slice(0, 3);
 * ```
 */
export class MistakePatternManager {
  private config: Required<PatternConfig>;

  constructor(
    private memoryStore: UnifiedMemoryStore,
    config?: PatternConfig
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Extract mistake patterns for a specific workflow phase
   *
   * @param phase - Workflow phase to extract patterns for
   * @returns Array of mistake patterns sorted by weight (descending)
   */
  async extractPatterns(phase?: string): Promise<MistakePattern[]> {
    // Query all mistakes from memory store
    const mistakes = await this.memoryStore.searchByType('mistake', {
      minImportance: this.config.minImportance,
      // No time limit - keep all mistakes as per user requirement
    });

    // Filter by phase if specified
    const relevantMistakes = phase
      ? mistakes.filter(m => this.isRelevantToPhase(m, phase))
      : mistakes;

    // Group mistakes by similarity (pattern extraction)
    const patternGroups = this.groupBySimilarity(relevantMistakes);

    // Convert groups to patterns with weighting
    const patterns: MistakePattern[] = [];
    for (const [signature, group] of patternGroups.entries()) {
      const pattern = this.createPattern(signature, group);

      // Calculate pattern weight
      pattern.weight = this.calculateWeight(pattern);

      patterns.push(pattern);
    }

    // Sort by weight descending
    patterns.sort((a, b) => b.weight - a.weight);

    return patterns;
  }

  /**
   * Check if a mistake is relevant to a workflow phase
   *
   * Uses tags and metadata to determine relevance.
   */
  private isRelevantToPhase(mistake: UnifiedMemory, phase: string): boolean {
    // Check tags
    if (mistake.tags?.includes(phase)) {
      return true;
    }

    // Check metadata
    if (mistake.metadata?.phase === phase) {
      return true;
    }

    // Phase-specific keyword matching
    const phaseKeywords: Record<string, string[]> = {
      'code-written': ['test', 'validation', 'verify', 'check'],
      'test-complete': ['commit', 'review', 'merge', 'approve'],
      'commit-ready': ['push', 'deploy', 'release', 'publish'],
    };

    const keywords = phaseKeywords[phase] || [];
    const contentLower = mistake.content.toLowerCase();

    return keywords.some(keyword => contentLower.includes(keyword));
  }

  /**
   * Group mistakes by similarity to extract patterns
   *
   * Uses content similarity and error type to group mistakes.
   * Returns a Map of signature -> mistake group.
   */
  private groupBySimilarity(mistakes: UnifiedMemory[]): Map<string, UnifiedMemory[]> {
    const groups = new Map<string, UnifiedMemory[]>();

    for (const mistake of mistakes) {
      // Generate signature from error type + key content words
      const signature = this.generateSignature(mistake);

      if (!groups.has(signature)) {
        groups.set(signature, []);
      }
      groups.get(signature)!.push(mistake);
    }

    // Filter out groups with too few occurrences
    for (const [signature, group] of groups.entries()) {
      if (group.length < this.config.minOccurrences) {
        groups.delete(signature);
      }
    }

    return groups;
  }

  /**
   * Generate a signature for pattern grouping
   *
   * Signature is based on:
   * - Error type (from metadata)
   * - Key content words (extracted from content)
   * - Workflow phase (if available)
   */
  private generateSignature(mistake: UnifiedMemory): string {
    const errorType = mistake.metadata?.errorType || 'unknown';

    // Extract key words from content (first 5 words)
    const words = mistake.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 5);

    const phase = mistake.metadata?.phase || 'general';

    return `${errorType}:${phase}:${words.join('-')}`;
  }

  /**
   * Create a pattern from a group of similar mistakes
   */
  private createPattern(signature: string, mistakes: UnifiedMemory[]): MistakePattern {
    // Calculate average importance
    const avgImportance = mistakes.length > 0
      ? mistakes.reduce((sum, m) => sum + m.importance, 0) / mistakes.length
      : 0.5; // Default importance if no mistakes

    // Extract occurrences
    const occurrences = mistakes.map(m => m.timestamp);

    // Extract phases
    const phases = new Set<string>();
    for (const m of mistakes) {
      if (m.metadata?.phase) {
        phases.add(m.metadata.phase as string);
      }
    }

    // Use the most recent mistake's content as description
    const latest = mistakes.reduce((latest, m) =>
      m.timestamp > latest.timestamp ? m : latest
    );

    return {
      id: signature,
      category: latest.metadata?.errorType as string || 'unknown',
      description: latest.content,
      baseImportance: avgImportance,
      occurrenceCount: mistakes.length,
      occurrences,
      weight: 0, // Will be calculated separately
      relatedPhases: Array.from(phases),
      prevention: latest.metadata?.preventionMethod as string || 'Review carefully',
    };
  }

  /**
   * Calculate pattern weight using:
   * - Base importance
   * - Repetition factor (logarithmic)
   * - Recency factor (exponential decay)
   *
   * Formula:
   * weight = base_importance * repetition_factor * recency_factor
   *
   * Where:
   * - repetition_factor = log(1 + occurrence_count)
   * - recency_factor = 1 / (1 + days_since_last * decay_rate)
   */
  private calculateWeight(pattern: MistakePattern): number {
    const { baseImportance, occurrenceCount, occurrences } = pattern;

    // Repetition factor: logarithmic growth
    // More repetitions = higher weight (but diminishing returns)
    const repetitionFactor = Math.log(1 + occurrenceCount);

    // Recency factor: exponential decay
    // Recent mistakes = higher weight
    const now = new Date();
    const lastOccurrence = occurrences[occurrences.length - 1];

    // Validate timestamp
    const timeDiff = now.getTime() - lastOccurrence.getTime();
    if (timeDiff < 0) {
      logger.warn('[MistakePatternManager] Invalid timestamp: lastOccurrence in future', {
        lastOccurrence,
        now,
      });
      return 0; // Future timestamp = invalid
    }

    const daysSinceLast = timeDiff / (1000 * 60 * 60 * 24);

    // Validate decayRate
    const decayRate = this.config.decayRate || 0.01;
    if (!Number.isFinite(decayRate) || decayRate <= 0) {
      logger.warn('[MistakePatternManager] Invalid decayRate', {
        decayRate: this.config.decayRate,
      });
      return 0.5; // Default recency factor
    }

    const recencyFactor = 1 / (1 + daysSinceLast * decayRate);

    // Defensive check
    if (!Number.isFinite(recencyFactor)) {
      logger.warn('[MistakePatternManager] Invalid recencyFactor calculation', {
        daysSinceLast,
        decayRate,
        recencyFactor,
      });
      return 0.5;
    }

    // Combined weight
    const weight = baseImportance * repetitionFactor * recencyFactor;

    // Normalize to 0-1 range (cap at 1.0)
    return Math.min(weight, 1.0);
  }

  /**
   * Get top N patterns by weight
   *
   * @param phase - Optional workflow phase filter
   * @param limit - Maximum number of patterns to return
   * @returns Top N patterns sorted by weight
   */
  async getTopPatterns(phase?: string, limit: number = 5): Promise<MistakePattern[]> {
    const patterns = await this.extractPatterns(phase);
    return patterns.slice(0, limit);
  }
}
