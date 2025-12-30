/**
 * Simplified Configuration System - Reads from environment variables only
 * Replaces over-engineered credentials system
 *
 * Purpose:
 * - MCP server doesn't need to manage API keys (uses Claude Code subscription)
 * - Simple environment variable reading, without complex encryption/audit/RBAC
 *
 * Environment Variables:
 * - CLAUDE_MODEL: Claude AI model name (default: claude-sonnet-4-5-20250929)
 * - OPENAI_API_KEY: OpenAI API Key (for RAG, optional)
 * - VECTRA_INDEX_PATH: Vectra vector index path (default: ~/.smart-agents/vectra)
 * - DATABASE_PATH: SQLite database path (default: ~/.smart-agents/database.db)
 * - NODE_ENV: Environment (development/production/test)
 * - LOG_LEVEL: Log level (debug/info/warn/error, default: info)
 */

/**
 * Simplified Configuration Class - All configuration read from environment variables
 */
export class SimpleConfig {
  /**
   * Claude AI Model (No longer needed, MCP server doesn't directly call Claude API)
   * Kept as reference, actually managed by Claude Code
   */
  static get CLAUDE_MODEL(): string {
    return process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
  }

  /**
   * OpenAI API Key (for RAG agent vector search, if needed)
   * Optional configuration, not all agents need it
   */
  static get OPENAI_API_KEY(): string {
    return process.env.OPENAI_API_KEY || '';
  }

  /**
   * Vectra Index Path (Knowledge graph vector index path)
   */
  static get VECTRA_INDEX_PATH(): string {
    return process.env.VECTRA_INDEX_PATH || `${process.env.HOME}/.smart-agents/vectra`;
  }

  /**
   * Database Path (SQLite database path)
   */
  static get DATABASE_PATH(): string {
    return process.env.DATABASE_PATH || `${process.env.HOME}/.smart-agents/database.db`;
  }

  /**
   * Node Environment
   */
  static get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Log Level
   */
  static get LOG_LEVEL(): 'debug' | 'info' | 'warn' | 'error' {
    const level = process.env.LOG_LEVEL || 'info';
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      return level as 'debug' | 'info' | 'warn' | 'error';
    }
    return 'info';
  }

  /**
   * Check if in development environment
   */
  static get isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  }

  /**
   * Check if in production environment
   */
  static get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  }

  /**
   * Check if in test environment
   */
  static get isTest(): boolean {
    return this.NODE_ENV === 'test';
  }

  /**
   * Validate required configuration exists
   * @returns List of missing configuration items
   */
  static validateRequired(): string[] {
    const missing: string[] = [];

    // VECTRA_INDEX_PATH and DATABASE_PATH have default values, no validation needed
    // OPENAI_API_KEY is optional, no validation needed

    // Currently no absolutely required configuration (under MCP server mode)
    return missing;
  }

  /**
   * Get all configuration (for debugging)
   * Note: Excludes sensitive information (API keys are masked)
   */
  static getAll(): Record<string, string | boolean> {
    return {
      CLAUDE_MODEL: this.CLAUDE_MODEL,
      OPENAI_API_KEY: this.OPENAI_API_KEY ? '***masked***' : '',
      VECTRA_INDEX_PATH: this.VECTRA_INDEX_PATH,
      DATABASE_PATH: this.DATABASE_PATH,
      NODE_ENV: this.NODE_ENV,
      LOG_LEVEL: this.LOG_LEVEL,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      isTest: this.isTest,
    };
  }
}

/**
 * Simplified DatabaseFactory replacement
 * Replaces original complex credentials/DatabaseFactory
 */
import Database from 'better-sqlite3';

export class SimpleDatabaseFactory {
  /**
   * Singleton instances cache
   */
  private static instances: Map<string, Database.Database> = new Map();

  /**
   * Create database connection (internal use)
   * @param path Database file path
   * @param isTest Whether this is a test database
   * @returns Database instance
   */
  private static createDatabase(path: string, isTest: boolean = false): Database.Database {
    try {
      const db = new Database(path, {
        verbose: SimpleConfig.isDevelopment ? console.log : undefined,
      });

      // Set busy timeout (5 seconds)
      db.pragma('busy_timeout = 5000');

      // Enable WAL mode for better performance (except test environment)
      if (!isTest) {
        db.pragma('journal_mode = WAL');
        // Increase cache size for better query performance (10MB)
        db.pragma('cache_size = -10000');
        // Enable memory-mapped I/O (128MB)
        db.pragma('mmap_size = 134217728');
      }

      // Enable foreign key constraints
      db.pragma('foreign_keys = ON');

      return db;
    } catch (error) {
      console.error(`Failed to create database at ${path}:`, error);
      throw error;
    }
  }

  /**
   * Get database instance (Singleton pattern)
   * @param path Database file path (optional, defaults to SimpleConfig)
   * @returns Database instance
   */
  static getInstance(path?: string): Database.Database {
    const dbPath = path || SimpleConfig.DATABASE_PATH;
    const existingDb = this.instances.get(dbPath);

    // If database exists and is open, return it
    if (existingDb?.open) {
      return existingDb;
    }

    // Close old connection if it exists but is not open (prevent resource leak)
    if (existingDb && !existingDb.open) {
      try {
        existingDb.close();
      } catch (error) {
        // Already closed or error, ignore
      }
      this.instances.delete(dbPath);
    }

    // Create new connection
    const newDb = this.createDatabase(dbPath, false);
    this.instances.set(dbPath, newDb);

    return newDb;
  }

  /**
   * Create test database (in-memory mode)
   * @returns Database instance
   */
  static createTestDatabase(): Database.Database {
    return this.createDatabase(':memory:', true);
  }

  /**
   * Close all database connections
   */
  static closeAll(): void {
    for (const [path, db] of this.instances.entries()) {
      try {
        db.close();
      } catch (error) {
        console.error(`Failed to close database at ${path}:`, error);
      }
    }
    this.instances.clear();
  }

  /**
   * Close specific database connection
   * @param path Database file path
   */
  static close(path?: string): void {
    const dbPath = path || SimpleConfig.DATABASE_PATH;
    const db = this.instances.get(dbPath);

    if (db) {
      try {
        db.close();
        this.instances.delete(dbPath);
      } catch (error) {
        console.error(`Failed to close database at ${dbPath}:`, error);
      }
    }
  }
}
