/**
 * Entity Types for Knowledge Graph
 * Standardized entity type definitions for auto-memory system
 */

export enum EntityType {
  // Task tracking
  TASK_START = 'task_start',

  // Decision tracking
  DECISION = 'decision',

  // Progress tracking
  PROGRESS_MILESTONE = 'progress_milestone',

  // Error tracking
  ERROR_RESOLUTION = 'error_resolution',

  // Testing
  TEST_RESULT = 'test_result',

  // Workflow
  WORKFLOW_CHECKPOINT = 'workflow_checkpoint',

  // Code changes
  CODE_CHANGE = 'code_change',
  COMMIT = 'commit',

  // Snapshots
  PROJECT_SNAPSHOT = 'project_snapshot',
}

/**
 * Type guard to check if a string is a valid EntityType value
 */
export function isValidEntityType(value: string): value is EntityType {
  return Object.values(EntityType).includes(value as EntityType);
}

/**
 * Get all entity types as string array
 */
export function getAllEntityTypes(): string[] {
  return Object.values(EntityType);
}
