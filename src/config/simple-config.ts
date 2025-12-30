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
   * 是否為開發環境
   */
  static get isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  }

  /**
   * 是否為生產環境
   */
  static get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  }

  /**
   * 是否為測試環境
   */
  static get isTest(): boolean {
    return this.NODE_ENV === 'test';
  }

  /**
   * 驗證必要配置是否存在
   * @returns 缺失的配置項目清單
   */
  static validateRequired(): string[] {
    const missing: string[] = [];

    // VECTRA_INDEX_PATH 和 DATABASE_PATH 有預設值，不檢查
    // OPENAI_API_KEY 是可選的，不檢查

    // 目前沒有絕對必要的配置（MCP server 模式下）
    return missing;
  }

  /**
   * 取得所有配置（用於除錯）
   * 注意：不包含敏感資訊（API keys 會被遮罩）
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
 * 簡化的 DatabaseFactory 替代品
 * 取代原本複雜的 credentials/DatabaseFactory
 */
import Database from 'better-sqlite3';

export class SimpleDatabaseFactory {
  /**
   * Singleton instances cache
   */
  private static instances: Map<string, Database.Database> = new Map();

  /**
   * 創建資料庫連接（內部使用）
   * @param path 資料庫檔案路徑
   * @param isTest 是否為測試資料庫
   * @returns Database 實例
   */
  private static createDatabase(path: string, isTest: boolean = false): Database.Database {
    try {
      const db = new Database(path, {
        verbose: SimpleConfig.isDevelopment ? console.log : undefined,
      });

      // 設定 busy timeout（5 秒）
      db.pragma('busy_timeout = 5000');

      // 啟用 WAL mode 提升性能（測試環境除外）
      if (!isTest) {
        db.pragma('journal_mode = WAL');
        // 增加 cache size 提升查詢性能（10MB）
        db.pragma('cache_size = -10000');
        // 啟用 memory-mapped I/O（128MB）
        db.pragma('mmap_size = 134217728');
      }

      // 啟用外鍵約束
      db.pragma('foreign_keys = ON');

      return db;
    } catch (error) {
      console.error(`Failed to create database at ${path}:`, error);
      throw error;
    }
  }

  /**
   * 取得資料庫實例（Singleton pattern）
   * @param path 資料庫檔案路徑（可選，預設使用 SimpleConfig）
   * @returns Database 實例
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
   * 創建測試資料庫（記憶體模式）
   * @returns Database 實例
   */
  static createTestDatabase(): Database.Database {
    return this.createDatabase(':memory:', true);
  }

  /**
   * 關閉所有資料庫連接
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
   * 關閉特定資料庫連接
   * @param path 資料庫檔案路徑
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
