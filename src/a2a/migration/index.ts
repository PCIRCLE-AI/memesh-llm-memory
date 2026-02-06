/**
 * @fileoverview Migration utilities for A2A task storage
 *
 * Provides tools for migrating from per-agent TaskQueue databases
 * to the unified TaskBoard storage format.
 */

export {
  migrateToUnifiedTaskBoard,
  detectOldDatabases,
  mapStateToStatus,
  extractPlatformFromAgentId,
  type MigrationOptions,
  type MigrationResult,
  type DatabaseMigrationResult,
} from './migrateToUnifiedTaskBoard.js';
