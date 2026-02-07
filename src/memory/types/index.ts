/**
 * Memory Types Index
 *
 * Re-exports all memory-related types for convenient imports.
 */

export type {
  MemoryType,
  UnifiedMemory,
  SearchOptions,
  SearchResult,
} from './unified-memory.js';

export {
  MEMORY_TYPE_TO_ENTITY_TYPE,
  ENTITY_TYPE_TO_MEMORY_TYPE,
} from './unified-memory.js';

// Memory Scope types for hierarchical memory organization
export { MemoryScope } from './memory-scope.js';
export type { MemoryScopeMetadata } from './memory-scope.js';
export {
  requiresProjectName,
  canHaveTechStack,
  canHaveDomain,
  getScopePriority,
  compareScopePriority,
  getScopeDescription,
  validateScopeMetadata,
  createScopeFilter,
} from './memory-scope.js';

// Preference types for UserPreferenceEngine
export type {
  PreferenceCategory,
  PreferenceConfidence,
  UserPreference,
  PreferenceViolation,
  PreferencePattern,
} from './preference-types.js';
