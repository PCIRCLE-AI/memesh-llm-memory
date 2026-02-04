/**
 * UserPreferenceEngine - Simplified
 *
 * Stores and retrieves user preferences for personalized assistance.
 * Intelligence (preference extraction, conflict detection, resolution) delegated to LLM via MCP tool descriptions.
 *
 * Features:
 * - Store user preferences
 * - Retrieve all preferences
 * - Basic CRUD operations
 *
 * Removed (delegated to LLM):
 * - Preference extraction from mistakes
 * - Pattern matching and keyword extraction
 * - Conflict detection
 * - Preference consolidation
 */

import { UnifiedMemoryStore } from './UnifiedMemoryStore.js';
import type { UnifiedMemory } from './types/unified-memory.js';
import type {
  UserPreference,
  PreferenceCategory,
  PreferenceConfidence,
} from './types/preference-types.js';
import { logger } from '../utils/logger.js';

/**
 * Prefix for preference IDs (internal tracking)
 */
const PREFERENCE_PREFIX = 'user-preference-';

/**
 * Tag used to identify preference memories
 */
const PREFERENCE_TAG = 'user-preference';

/**
 * Metadata key for preference data
 */
const PREFERENCE_METADATA_KEY = 'preferenceData';

/**
 * UserPreferenceEngine - Simplified user preference storage
 *
 * Intelligence delegated to LLM:
 * - Preference extraction → LLM analyzes mistakes and identifies preferences
 * - Conflict detection → LLM identifies conflicting preferences
 * - Resolution → LLM resolves conflicts based on context
 * - Pattern matching → LLM understands semantic patterns
 */
export class UserPreferenceEngine {
  constructor(private memoryStore: UnifiedMemoryStore) {}

  /**
   * Store a user preference
   *
   * LLM should create the preference structure based on user feedback analysis.
   * This method simply stores the preference in the memory system.
   *
   * @param preference - User preference created by LLM
   */
  async storePreference(preference: UserPreference): Promise<void> {
    try {
      const memoryId = await this.memoryStore.store(
        {
          type: 'user-preference',
          content: this.preferenceToContent(preference),
          context: `User Preference: ${preference.category}`,
          tags: [PREFERENCE_TAG, `category:${preference.category}`],
          importance: this.confidenceToImportance(preference.confidence),
          timestamp: new Date(),
          metadata: {
            [PREFERENCE_METADATA_KEY]: preference,
          },
        },
        {
          projectPath: process.cwd(),
        }
      );

      logger.debug(`Stored preference: ${preference.category} (ID: ${memoryId})`);
    } catch (error) {
      logger.error('Failed to store preference:', error);
      throw error;
    }
  }

  /**
   * Retrieve all user preferences
   *
   * @returns Array of all user preferences
   */
  async getAllPreferences(): Promise<UserPreference[]> {
    try {
      const memories = await this.memoryStore.searchByTags([PREFERENCE_TAG]);
      return memories.map((m) => this.memoryToPreference(m)).filter((p): p is UserPreference => p !== null);
    } catch (error) {
      logger.error('Failed to get all preferences:', error);
      return [];
    }
  }

  /**
   * Get preferences by category
   *
   * @param category - Preference category to filter by
   * @returns Array of preferences in the specified category
   */
  async getPreferencesByCategory(category: PreferenceCategory): Promise<UserPreference[]> {
    try {
      const allPreferences = await this.getAllPreferences();
      return allPreferences.filter((p) => p.category === category);
    } catch (error) {
      logger.error(`Failed to get preferences by category ${category}:`, error);
      return [];
    }
  }

  /**
   * Get basic statistics about stored preferences
   *
   * @returns Statistics object with preference counts by category and confidence
   */
  async getStatistics(): Promise<{
    totalPreferences: number;
    byCategory: Record<PreferenceCategory, number>;
    byConfidence: Record<PreferenceConfidence, number>;
  }> {
    try {
      const preferences = await this.getAllPreferences();
      const byCategory: Record<string, number> = {};
      const byConfidence: Record<string, number> = {};

      for (const pref of preferences) {
        byCategory[pref.category] = (byCategory[pref.category] ?? 0) + 1;
        byConfidence[pref.confidence] = (byConfidence[pref.confidence] ?? 0) + 1;
      }

      return {
        totalPreferences: preferences.length,
        byCategory: byCategory as Record<PreferenceCategory, number>,
        byConfidence: byConfidence as Record<PreferenceConfidence, number>,
      };
    } catch (error) {
      logger.error('Failed to get statistics:', error);
      return {
        totalPreferences: 0,
        byCategory: {} as Record<PreferenceCategory, number>,
        byConfidence: {} as Record<PreferenceConfidence, number>,
      };
    }
  }

  /**
   * Convert preference to content string
   *
   * @param preference - User preference object
   * @returns Content string for storage
   */
  private preferenceToContent(preference: UserPreference): string {
    const parts: string[] = [];

    if (preference.likes.length > 0) {
      parts.push(`Likes: ${preference.likes.join(', ')}`);
    }

    if (preference.dislikes.length > 0) {
      parts.push(`Dislikes: ${preference.dislikes.join(', ')}`);
    }

    if (preference.rules.length > 0) {
      parts.push(`Rules: ${preference.rules.join('; ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Convert unified memory to user preference
   *
   * @param memory - Unified memory object
   * @returns User preference or null if conversion fails
   */
  private memoryToPreference(memory: UnifiedMemory): UserPreference | null {
    try {
      const preferenceData = memory.metadata?.[PREFERENCE_METADATA_KEY];
      if (!preferenceData) {
        logger.warn('Memory missing preference data');
        return null;
      }

      return preferenceData as UserPreference;
    } catch (error) {
      logger.error('Failed to convert memory to preference:', error);
      return null;
    }
  }

  /**
   * Convert confidence level to normalized importance score
   *
   * Maps confidence levels to importance values in the 0-1 range
   * as required by UnifiedMemoryStore (which validates importance is in [0, 1]).
   *
   * Mapping rationale:
   * - low    -> 0.3 (still retained, above minimum threshold)
   * - medium -> 0.6 (above midpoint, default fallback)
   * - high   -> 0.9 (near-maximum, reserved space for future "critical" level)
   * - unknown -> 0.5 (neutral midpoint for unrecognized confidence levels)
   *
   * @param confidence - Preference confidence level
   * @returns Importance score normalized to [0, 1]
   */
  private confidenceToImportance(confidence: PreferenceConfidence): number {
    switch (confidence) {
      case 'low':
        return 0.3;
      case 'medium':
        return 0.6;
      case 'high':
        return 0.9;
      default:
        logger.warn(
          `[UserPreferenceEngine] Unrecognized confidence level: "${confidence}", defaulting to 0.5`
        );
        return 0.5;
    }
  }
}
