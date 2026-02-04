/**
 * ProjectMemoryCleanup - Automatic cleanup of old memories
 *
 * Deletes memories older than 90 days to prevent unbounded growth
 * of the Knowledge Graph database.
 */

import type { KnowledgeGraph } from '../knowledge-graph/index.js';
import type { Entity } from '../knowledge-graph/types.js';

/**
 * ✅ FIX MEDIUM-3: Enhanced cleanup result with failure tracking
 */
export interface CleanupResult {
  deleted: number;
  failed: number;
  errors: Array<{ entity: string; error: string }>;
}

export class ProjectMemoryCleanup {
  private knowledgeGraph: KnowledgeGraph;
  private readonly RETENTION_DAYS = 90;

  constructor(knowledgeGraph: KnowledgeGraph) {
    this.knowledgeGraph = knowledgeGraph;
  }

  /**
   * Delete memories older than retention period (90 days)
   *
   * ✅ FIX MEDIUM-3: Now returns detailed results including failures
   * Failed deletions are tracked and reported for debugging.
   *
   * @returns Cleanup result with deleted count, failed count, and error details
   */
  async cleanupOldMemories(): Promise<CleanupResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const memoryTypes = ['code_change', 'test_result', 'session_snapshot'];
    let deletedCount = 0;
    let failedCount = 0;
    const errors: Array<{ entity: string; error: string }> = [];

    for (const type of memoryTypes) {
      const entities = this.knowledgeGraph.searchEntities({ entityType: type as any });

      for (const entity of entities) {
        const timestamp = this.extractTimestamp(entity);

        if (timestamp && timestamp < cutoffDate) {
          try {
            const deleted = this.knowledgeGraph.deleteEntity(entity.name);
            if (deleted) {
              deletedCount++;
            } else {
              failedCount++;
              errors.push({
                entity: entity.name,
                error: 'Delete returned false (may have foreign key constraints)',
              });
            }
          } catch (error) {
            failedCount++;
            errors.push({
              entity: entity.name,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }

    return { deleted: deletedCount, failed: failedCount, errors };
  }

  /**
   * Extract timestamp from entity observations
   * Looks for observations in format: "Timestamp: 2025-12-31T10:00:00Z"
   * @param entity - Entity to extract timestamp from
   * @returns Date object or null if no valid timestamp found
   */
  private extractTimestamp(entity: Entity): Date | null {
    const timestampObs = entity.observations?.find(o =>
      o.startsWith('Timestamp:')
    );

    if (!timestampObs) return null;

    const timestampStr = timestampObs.split('Timestamp:')[1]?.trim();
    if (!timestampStr) return null;

    const timestamp = new Date(timestampStr);
    // Check if date is valid
    if (isNaN(timestamp.getTime())) return null;

    return timestamp;
  }
}
