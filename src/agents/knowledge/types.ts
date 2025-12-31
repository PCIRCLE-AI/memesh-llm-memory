/**
 * Knowledge Graph type definitions
 */

export interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
}

export interface SearchOptions {
  entityType?: string;
  limit?: number;
  offset?: number;
}
