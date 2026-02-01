/**
 * MistakePatternEngine - Simplified
 *
 * Stores and retrieves mistake records for learning and prevention.
 * Intelligence (pattern extraction, categorization, consolidation) delegated to LLM via MCP tool descriptions.
 *
 * Features:
 * - Store mistake records with prevention rules
 * - Retrieve all rules
 * - Basic CRUD operations
 *
 * Removed (delegated to LLM):
 * - Pattern extraction from mistakes
 * - Automatic categorization
 * - Rule consolidation
 * - Operation checking
 */

import { UnifiedMemoryStore } from './UnifiedMemoryStore.js';
import type { UnifiedMemory } from './types/unified-memory.js';
import type {
  PreventionRule,
  MistakeInput,
} from './types/pattern-types.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

/**
 * Tag used to identify prevention rules in the memory store
 */
const PREVENTION_RULE_TAG = 'prevention-rule';

/**
 * MistakePatternEngine - Simplified mistake record storage
 *
 * Intelligence delegated to LLM:
 * - Pattern extraction → LLM analyzes mistake and creates rule
 * - Categorization → LLM determines category
 * - Consolidation → LLM identifies similar patterns
 * - Operation checking → LLM evaluates violations
 */
export class MistakePatternEngine {
  constructor(private memoryStore: UnifiedMemoryStore) {}

  /**
   * Save a prevention rule to the memory store
   *
   * LLM should create the rule structure based on the mistake analysis.
   * This method simply stores the rule in the memory system.
   *
   * @param rule - Prevention rule created by LLM
   */
  async saveRule(rule: PreventionRule): Promise<void> {
    try {
      // Store in unified memory with prevention-rule tag
      const memoryId = await this.memoryStore.store(
        {
          type: 'prevention-rule',
          content: JSON.stringify({
            name: rule.name,
            category: rule.category,
            trigger: rule.trigger,
            check: rule.check,
            action: rule.action,
            sourceMistakeIds: rule.sourceMistakeIds,
            confidence: rule.confidence,
          }),
          context: `Prevention Rule: ${rule.name}`,
          tags: [PREVENTION_RULE_TAG, `category:${rule.category}`],
          importance: rule.hitCount,
          timestamp: rule.createdAt,
          metadata: {
            ruleId: rule.id,
            hitCount: rule.hitCount,
            confidence: rule.confidence,
          },
        },
        {
          projectPath: process.cwd(),
        }
      );

      logger.debug(`Saved prevention rule: ${rule.name} (ID: ${memoryId})`);
    } catch (error) {
      logger.error('Failed to save prevention rule:', error);
      throw error;
    }
  }

  /**
   * Retrieve all prevention rules from memory
   *
   * @returns Array of all prevention rules
   */
  async getAllRules(): Promise<PreventionRule[]> {
    try {
      const memories = await this.memoryStore.searchByTags([PREVENTION_RULE_TAG]);
      return memories.map((memory) => this.memoryToRule(memory)).filter((rule): rule is PreventionRule => rule !== null);
    } catch (error) {
      logger.error('Failed to get all rules:', error);
      return [];
    }
  }

  /**
   * Get a prevention rule by ID
   *
   * @param ruleId - Rule ID to retrieve
   * @returns Prevention rule if found, null otherwise
   */
  async getRuleById(ruleId: string): Promise<PreventionRule | null> {
    try {
      const allRules = await this.getAllRules();
      return allRules.find((rule) => rule.id === ruleId) ?? null;
    } catch (error) {
      logger.error(`Failed to get rule by ID ${ruleId}:`, error);
      return null;
    }
  }

  /**
   * Get basic statistics about stored rules
   *
   * @returns Statistics object with rule counts by category
   */
  async getStatistics(): Promise<{
    totalRules: number;
    byCategory: Record<string, number>;
  }> {
    try {
      const rules = await this.getAllRules();
      const byCategory: Record<string, number> = {};

      for (const rule of rules) {
        byCategory[rule.category] = (byCategory[rule.category] ?? 0) + 1;
      }

      return {
        totalRules: rules.length,
        byCategory,
      };
    } catch (error) {
      logger.error('Failed to get statistics:', error);
      return { totalRules: 0, byCategory: {} };
    }
  }

  /**
   * Convert unified memory to prevention rule
   *
   * @param memory - Unified memory object
   * @returns Prevention rule or null if conversion fails
   */
  private memoryToRule(memory: UnifiedMemory): PreventionRule | null {
    try {
      const data = JSON.parse(memory.content);
      return {
        id: memory.metadata?.ruleId as string,
        name: data.name,
        category: data.category,
        trigger: data.trigger,
        check: data.check,
        action: data.action,
        sourceMistakeIds: data.sourceMistakeIds ?? [],
        confidence: data.confidence ?? 'medium',
        hitCount: (memory.metadata?.hitCount as number) ?? 0,
        createdAt: memory.timestamp ?? new Date(),
      };
    } catch (error) {
      logger.error('Failed to convert memory to rule:', error);
      return null;
    }
  }
}
