/**
 * Semantic Groups Configuration
 *
 * Defines semantic equivalence groups for keyword matching in ProactiveReminder.
 * Words in the same group are considered semantically related for similarity scoring.
 *
 * Usage:
 * - Add new groups to extend semantic matching capabilities
 * - Each group should contain words that are contextually interchangeable
 * - Keep groups focused on specific concepts for better matching accuracy
 *
 * @example
 * // To add a new semantic group:
 * ['build', 'compile', 'bundle', 'transpile']
 */

/**
 * Semantic group representing contextually related words
 */
export type SemanticGroup = string[];

/**
 * Collection of semantic groups for keyword matching
 */
export interface SemanticGroupsConfig {
  /** All semantic groups */
  groups: SemanticGroup[];
}

/**
 * Default semantic groups for file operations and development tasks
 */
export const SEMANTIC_GROUPS: SemanticGroup[] = [
  // File modification operations
  ['edit', 'modify', 'modified', 'change', 'changed', 'update', 'updated'],

  // File references
  ['file', 'files'],

  // Testing operations
  ['test', 'tests', 'testing', 'tested'],

  // Verification operations
  ['verify', 'verified', 'verification', 'check', 'checked'],

  // Execution operations
  ['run', 'running', 'execute', 'executed'],

  // Completion operations
  ['complete', 'completion', 'finish', 'finished', 'done'],

  // Refactoring operations
  ['refactor', 'refactoring', 'refactored'],

  // Creation operations
  ['add', 'added', 'create', 'created'],

  // Deletion operations
  ['delete', 'deleted', 'remove', 'removed'],
];

/**
 * Get all semantic groups
 *
 * @returns Array of semantic groups
 */
export function getSemanticGroups(): SemanticGroup[] {
  return SEMANTIC_GROUPS;
}

/**
 * Find the semantic group containing a keyword
 *
 * @param keyword - Keyword to find
 * @returns Semantic group containing the keyword, or undefined if not found
 */
export function findSemanticGroup(keyword: string): SemanticGroup | undefined {
  return SEMANTIC_GROUPS.find((group) => group.includes(keyword));
}

/**
 * Check if two keywords are semantically related
 *
 * @param keyword1 - First keyword
 * @param keyword2 - Second keyword
 * @returns True if keywords are in the same semantic group
 */
export function areSemanticallySimilar(keyword1: string, keyword2: string): boolean {
  const group = findSemanticGroup(keyword1);
  return group ? group.includes(keyword2) : false;
}
