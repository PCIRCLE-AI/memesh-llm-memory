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
  // Embedding fields for vector semantic search
  embedding?: Float32Array;
  embeddingModel?: string;
  embeddingVersion?: number;
  embeddedAt?: Date;
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

/**
 * Statistics about embeddings in the knowledge graph
 */
export interface EmbeddingStats {
  withEmbeddings: number;
  withoutEmbeddings: number;
  total: number;
}

/**
 * Configuration for embedding operations
 */
export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  enabled: boolean;
  semanticSearchEnabled: boolean;
}
