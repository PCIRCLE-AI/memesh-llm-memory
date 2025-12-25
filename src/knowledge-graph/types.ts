/**
 * Knowledge Graph Types
 *
 * Lightweight SQLite-based knowledge graph for smart-agents
 * No Docker required - standalone and portable
 */

export interface Entity {
  id?: number;
  name: string;
  type: EntityType;
  observations: string[];
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export type EntityType =
  | 'decision'           // Architecture/technical decisions
  | 'bug_fix'           // Bug fixes and their root causes
  | 'feature'           // Feature implementations
  | 'lesson_learned'    // Lessons learned from incidents
  | 'best_practice'     // Validated best practices
  | 'problem_solution'  // Problem-solution pairs
  | 'technical_debt'    // Technical debt items
  | 'optimization'      // Performance optimizations
  | 'refactoring';      // Refactoring decisions

export interface Relation {
  id?: number;
  from: string;         // Entity name (from)
  to: string;           // Entity name (to)
  relationType: RelationType;
  metadata?: Record<string, any>;
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
  type?: EntityType;
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
    metadata?: Record<string, any>;
  }>;
  depth?: number;
}
