/**
 * Preference Types for UserPreferenceEngine
 *
 * Part of Phase 0.7.0 Memory System Upgrade.
 * These types define user preferences learned from mistakes.
 */

/**
 * Categories of user preferences
 */
export type PreferenceCategory =
  | 'instruction-following'
  | 'memory-management'
  | 'efficiency'
  | 'code-quality'
  | 'communication'
  | 'verification'
  | 'other';

/**
 * Confidence level for extracted preferences
 */
export type PreferenceConfidence = 'low' | 'medium' | 'high';

/**
 * User preference learned from mistakes
 */
export interface UserPreference {
  /** Unique identifier for the preference */
  id: string;

  /** Category of the preference */
  category: PreferenceCategory;

  /** What the user prefers/likes */
  likes: string[];

  /** What the user dislikes/wants to avoid */
  dislikes: string[];

  /** Derived behavior rules based on this preference */
  rules: string[];

  /** IDs of mistakes that contributed to this preference */
  sourceMistakes: string[];

  /** Confidence level of the extracted preference */
  confidence: PreferenceConfidence;

  /** When this preference was first created */
  createdAt: Date;

  /** When this preference was last updated */
  updatedAt?: Date;
}

/**
 * Result of checking an operation against preferences
 */
export interface PreferenceViolation {
  /** The preference that was violated */
  preference: UserPreference;

  /** Specific rule that was violated */
  violatedRule: string;

  /** Severity of the violation */
  severity: 'warning' | 'error';

  /** Suggested action to avoid violation */
  suggestion?: string;
}

/**
 * Patterns for extracting preferences from mistake content
 */
export interface PreferencePattern {
  /** Keywords that trigger this pattern */
  keywords: string[];

  /** Category to assign */
  category: PreferenceCategory;

  /** What this indicates the user likes */
  likes: string[];

  /** What this indicates the user dislikes */
  dislikes: string[];

  /** Rules derived from this pattern */
  rules: string[];

  /** Base confidence for this pattern */
  confidence: PreferenceConfidence;
}
