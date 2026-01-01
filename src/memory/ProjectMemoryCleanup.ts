/**
 * ProjectMemoryCleanup - Automatic cleanup of old memories
 *
 * Deletes memories older than 30 days to prevent unbounded growth
 * of the Knowledge Graph database.
 */

import type { KnowledgeGraph } from '../knowledge-graph/index.js';
import type { Entity } from '../knowledge-graph/types.js';

export class ProjectMemoryCleanup {
  private knowledgeGraph: KnowledgeGraph;
  private readonly RETENTION_DAYS = 30;

  constructor(knowledgeGraph: KnowledgeGraph) {
    this.knowledgeGraph = knowledgeGraph;
  }

  /**
   * Delete memories older than retention period (30 days)
   * @returns Number of entities deleted
   */
  async cleanupOldMemories(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

    const memoryTypes = ['code_change', 'test_result', 'session_snapshot'];
    let deletedCount = 0;

    for (const type of memoryTypes) {
      const entities = this.knowledgeGraph.searchEntities({ type: type as any });

      for (const entity of entities) {
        const timestamp = this.extractTimestamp(entity);

        if (timestamp && timestamp < cutoffDate) {
          const deleted = this.knowledgeGraph.deleteEntity(entity.name);
          if (deleted) {
            deletedCount++;
          }
        }
      }
    }

    return deletedCount;
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
