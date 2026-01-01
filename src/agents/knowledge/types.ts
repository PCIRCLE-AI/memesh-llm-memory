/**
 * Knowledge Graph type definitions
 */

export interface Entity {
  name: string;
  entityType: string;
  observations: string[];
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

export interface SearchOptions {
  entityType?: string;
  limit?: number;
  offset?: number;
}
