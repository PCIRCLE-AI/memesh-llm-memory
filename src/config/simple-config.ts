/**
 * 簡化配置系統 - 僅從環境變數讀取
 * 取代過度設計的 credentials 系統
 *
 * 用途：
 * - MCP server 不需要管理 API keys（使用 Claude Code subscription）
 * - 簡單的環境變數讀取，無需複雜的加密/審計/RBAC
 *
 * 環境變數：
 * - CLAUDE_MODEL: Claude AI 模型名稱（預設：claude-sonnet-4-5-20250929）
 * - OPENAI_API_KEY: OpenAI API Key（用於 RAG，可選）
 * - VECTRA_INDEX_PATH: Vectra 向量索引路徑（預設：~/.smart-agents/vectra）
 * - DATABASE_PATH: SQLite 資料庫路徑（預設：~/.smart-agents/database.db）
 * - NODE_ENV: 環境（development/production/test）
 * - LOG_LEVEL: 日誌級別（debug/info/warn/error，預設：info）
 */

/**
 * 簡化配置類別 - 所有配置從環境變數讀取
 */
export class SimpleConfig {
  /**
   * Claude AI Model（已不需要，MCP server 不直接調用 Claude API）
   * 保留作為參考，實際由 Claude Code 管理
   */
  static get CLAUDE_MODEL(): string {
    return process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
  }

  /**
   * OpenAI API Key（用於 RAG agent 的向量檢索，如需要）
   * 可選配置，不是所有 agents 都需要
   */
  static get OPENAI_API_KEY(): string {
    return process.env.OPENAI_API_KEY || '';
  }

  /**
   * Vectra Index Path（知識圖譜向量索引路徑）
   */
  static get VECTRA_INDEX_PATH(): string {
    return process.env.VECTRA_INDEX_PATH || `${process.env.HOME}/.smart-agents/vectra`;
  }

  /**
   * Database Path（SQLite 資料庫路徑）
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
   * Log Level（日誌級別）
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

    // Check if database is closed or doesn't exist
    if (!existingDb || !existingDb.open) {
      // Remove closed instance and create new one
      if (existingDb) {
        this.instances.delete(dbPath);
      }
      this.instances.set(dbPath, this.createDatabase(dbPath, false));
    }

    return this.instances.get(dbPath)!;
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
