/**
 * Knowledge Graph Types
 *
 * Lightweight SQLite-based knowledge graph for claude-code-buddy
 * No Docker required - standalone and portable
 */

export interface Entity {
  id?: number;
  name: string;
  entityType: EntityType;
  observations: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export type EntityType =
  // Knowledge types
  | 'decision'           // Architecture/technical decisions
  | 'bug_fix'           // Bug fixes and their root causes
  | 'feature'           // Feature implementations
  | 'lesson_learned'    // Lessons learned from incidents
  | 'best_practice'     // Validated best practices
  | 'problem_solution'  // Problem-solution pairs
  | 'technical_debt'    // Technical debt items
  | 'optimization'      // Performance optimizations
  | 'refactoring'       // Refactoring decisions
  // Memory/tracking types
  | 'code_change'       // Code change events
  | 'test_result'       // Test execution results
  | 'session_snapshot'  // Session state snapshots
  | 'project_snapshot'  // Project state snapshots
  | 'workflow_checkpoint' // Workflow phase completion checkpoints
  | 'commit';           // Git commit events

export interface Relation {
  id?: number;
  from: string;         // Entity name (from)
  to: string;           // Entity name (to)
  relationType: RelationType;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export type RelationType =
  | 'caused_by'         // A caused by B
  | 'enabled_by'        // A enabled by B
  | 'follows_pattern'   // A follows pattern from B
  | 'solves'            // A solves B
  | 'replaced_by'       // A replaced by B
  | 'depends_on'        // A depends on B
  | 'similar_to'        // A similar to B
  | 'evolved_from';     // A evolved from B

export interface SearchQuery {
  entityType?: EntityType;
  tag?: string;
  namePattern?: string;
  limit?: number;
  offset?: number;
}

export interface RelationTrace {
  entity: string;
  relations: Array<{
    from: string;
    to: string;
    relationType: RelationType;
    metadata?: Record<string, unknown>;
  }>;
  depth?: number;
}
