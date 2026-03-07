/**
 * SqliteVecAdapter - Concrete VectorSearchAdapter implementation using sqlite-vec
 *
 * Instance-based adapter that wraps sqlite-vec operations behind the
 * VectorSearchAdapter interface. Extracted from the static VectorExtension class
 * to enable dependency injection and testing with alternative implementations.
 */

import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { logger } from '../utils/logger.js';
import type { VectorSearchAdapter, KnnSearchResult } from './VectorSearchAdapter.js';
import { DEFAULT_EMBEDDING_DIMENSIONS } from './VectorSearchAdapter.js';

/**
 * Convert Buffer to Float32Array
 * Handles byte alignment by slicing the underlying ArrayBuffer
 */
function bufferToFloat32Array(buffer: Buffer): Float32Array {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
  return new Float32Array(arrayBuffer);
}

/**
 * Concrete implementation of VectorSearchAdapter using sqlite-vec.
 *
 * Uses a WeakSet to track which databases have the extension loaded,
 * preventing double-loading which would cause errors.
 */
export class SqliteVecAdapter implements VectorSearchAdapter {
  /** Track databases that have already loaded the extension */
  private extensionLoaded = new WeakSet<Database.Database>();

  loadExtension(db: Database.Database): void {
    if (this.extensionLoaded.has(db)) {
      return;
    }

    try {
      sqliteVec.load(db);
      this.extensionLoaded.add(db);
      logger.debug('sqlite-vec extension loaded successfully');
    } catch (error) {
      logger.error('Failed to load sqlite-vec extension', { error });
      throw new Error(
        `Failed to load sqlite-vec: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  createVectorTable(db: Database.Database, dimensions: number = DEFAULT_EMBEDDING_DIMENSIONS): void {
    this.ensureExtensionLoaded(db);

    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS entity_embeddings USING vec0(
        entity_name TEXT PRIMARY KEY,
        embedding float[${dimensions}] distance_metric=cosine
      )
    `);

    logger.debug('Vector table created', { dimensions });
  }

  insertEmbedding(
    db: Database.Database,
    entityName: string,
    embedding: Float32Array,
    dimensions: number = DEFAULT_EMBEDDING_DIMENSIONS
  ): void {
    if (embedding.length !== dimensions) {
      throw new Error(
        `Invalid embedding dimensions: expected ${dimensions}, got ${embedding.length}. ` +
        `Entity: ${entityName}`
      );
    }

    this.ensureExtensionLoaded(db);

    // vec0 virtual tables don't support REPLACE; delete first then insert
    const deleteStmt = db.prepare('DELETE FROM entity_embeddings WHERE entity_name = ?');
    deleteStmt.run(entityName);

    const insertStmt = db.prepare(`
      INSERT INTO entity_embeddings (entity_name, embedding)
      VALUES (?, ?)
    `);

    // sqlite-vec accepts JSON arrays for vector input
    const vectorJson = JSON.stringify(Array.from(embedding));
    insertStmt.run(entityName, vectorJson);
  }

  deleteEmbedding(db: Database.Database, entityName: string): void {
    this.ensureExtensionLoaded(db);
    const stmt = db.prepare('DELETE FROM entity_embeddings WHERE entity_name = ?');
    stmt.run(entityName);
  }

  knnSearch(
    db: Database.Database,
    queryEmbedding: Float32Array,
    k: number,
    dimensions: number = DEFAULT_EMBEDDING_DIMENSIONS
  ): KnnSearchResult[] {
    if (queryEmbedding.length !== dimensions) {
      throw new Error(
        `Invalid query embedding dimensions: expected ${dimensions}, got ${queryEmbedding.length}`
      );
    }

    this.ensureExtensionLoaded(db);

    const queryJson = JSON.stringify(Array.from(queryEmbedding));

    const stmt = db.prepare(`
      SELECT
        entity_name,
        distance
      FROM entity_embeddings
      WHERE embedding MATCH ?
        AND k = ?
    `);

    const rows = stmt.all(queryJson, k) as Array<{ entity_name: string; distance: number }>;

    return rows.map(row => ({
      entityName: row.entity_name,
      distance: row.distance
    }));
  }

  getEmbedding(db: Database.Database, entityName: string): Float32Array | null {
    this.ensureExtensionLoaded(db);

    const stmt = db.prepare('SELECT embedding FROM entity_embeddings WHERE entity_name = ?');
    const row = stmt.get(entityName) as { embedding: Buffer | string } | undefined;

    if (!row) {
      return null;
    }

    if (Buffer.isBuffer(row.embedding)) {
      return bufferToFloat32Array(row.embedding);
    }

    if (typeof row.embedding === 'string') {
      return new Float32Array(JSON.parse(row.embedding));
    }

    logger.warn('Unexpected embedding format for entity', { entityName });
    return null;
  }

  hasEmbedding(db: Database.Database, entityName: string): boolean {
    this.ensureExtensionLoaded(db);
    const stmt = db.prepare('SELECT 1 FROM entity_embeddings WHERE entity_name = ? LIMIT 1');
    const row = stmt.get(entityName);
    return row !== undefined;
  }

  getEmbeddingCount(db: Database.Database): number {
    const stmt = db.prepare('SELECT COUNT(*) as cnt FROM entity_embeddings');
    const row = stmt.get() as { cnt: number };
    return row.cnt;
  }

  /**
   * Ensure extension is loaded for the database
   */
  private ensureExtensionLoaded(db: Database.Database): void {
    if (!this.extensionLoaded.has(db)) {
      this.loadExtension(db);
    }
  }
}
