/**
 * Vectra Local Vector Store 封裝（輕量級、零依賴、開箱即用）
 */

import { LocalIndex } from 'vectra';
import path from 'path';
import { appConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type {
  DocumentInput,
  SearchResult,
  SearchOptions,
  RAGConfig,
  DocumentMetadata,
} from './types.js';
import { StateError, ValidationError, OperationError } from '../../errors/index.js';

export class VectorStore {
  private index: LocalIndex | null = null;
  private config: RAGConfig;
  private isInitialized = false;
  private dataPath: string;

  constructor(config?: Partial<RAGConfig>) {
    this.config = {
      embeddingModel: config?.embeddingModel || appConfig.openai.embeddings.model,
      embeddingDimension: config?.embeddingDimension || 1536,
      maxBatchSize: config?.maxBatchSize || 100,
      cacheEnabled: config?.cacheEnabled ?? true,
    };

    // 本地存儲路徑（在專案根目錄的 data/vectorstore）
    this.dataPath = path.join(process.cwd(), 'data', 'vectorstore');
  }

  /**
   * 初始化 Vector Store
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('VectorStore already initialized');
      return;
    }

    try {
      // 創建或載入 Vectra index
      this.index = new LocalIndex(this.dataPath);

      // 檢查 index 是否已存在
      if (!(await this.index.isIndexCreated())) {
        // 創建新 index
        await this.index.createIndex({ version: 1 });
        console.log(`Created new Vectra index at ${this.dataPath}`);
      } else {
        console.log(`Loaded existing Vectra index from ${this.dataPath}`);
      }

      this.isInitialized = true;
      console.log('VectorStore initialized successfully (local file storage)');
    } catch (error) {
      logger.error('Failed to initialize VectorStore', { error });
      throw new OperationError(
        `VectorStore initialization failed: ${error}`,
        {
          operation: 'initialize',
          dataPath: this.dataPath,
          embeddingModel: this.config.embeddingModel,
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * 確保已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.index) {
      throw new StateError(
        'VectorStore not initialized. Call initialize() first.',
        {
          component: 'VectorStore',
          operation: 'ensureInitialized',
          isInitialized: this.isInitialized,
          hasIndex: this.index !== null,
        }
      );
    }
  }

  /**
   * 添加單個文檔
   */
  async addDocument(doc: DocumentInput): Promise<void> {
    this.ensureInitialized();

    if (!doc.embedding) {
      throw new ValidationError(
        'Document must have embedding before adding to vector store',
        {
          hasContent: !!doc.content,
          hasMetadata: !!doc.metadata,
          hasEmbedding: false,
          expectedEmbeddingDimension: this.config.embeddingDimension,
        }
      );
    }

    const id = doc.id || this.generateId();

    await this.index!.insertItem({
      id,
      vector: doc.embedding,
      metadata: {
        content: doc.content,
        ...this.sanitizeMetadata(doc.metadata),
      },
    });
  }

  /**
   * 批次添加文檔
   */
  async addDocuments(docs: DocumentInput[]): Promise<void> {
    this.ensureInitialized();

    if (docs.length === 0) {
      return;
    }

    // 驗證所有文檔都有 embedding
    const missingEmbeddings = docs.filter((doc) => !doc.embedding);
    if (missingEmbeddings.length > 0) {
      throw new ValidationError(
        `${missingEmbeddings.length} documents missing embeddings`,
        {
          totalDocuments: docs.length,
          missingEmbeddingsCount: missingEmbeddings.length,
          validDocumentsCount: docs.length - missingEmbeddings.length,
          expectedEmbeddingDimension: this.config.embeddingDimension,
        }
      );
    }

    // 分批處理
    const batches = this.createBatches(docs, this.config.maxBatchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} docs)`);

      for (const doc of batch) {
        const id = doc.id || this.generateId();
        await this.index!.insertItem({
          id,
          vector: doc.embedding!,
          metadata: {
            content: doc.content,
            ...this.sanitizeMetadata(doc.metadata),
          },
        });
      }
    }

    console.log(`Successfully added ${docs.length} documents`);
  }

  /**
   * 語義搜尋（已棄用，使用 searchWithEmbedding）
   */
  async search(_options: SearchOptions): Promise<SearchResult[]> {
    this.ensureInitialized();
    throw new OperationError(
      'Use searchWithEmbedding() instead. This method is deprecated - generate query embedding first.',
      {
        operation: 'search',
        component: 'VectorStore',
        deprecatedMethod: 'search',
        recommendedMethod: 'searchWithEmbedding',
      }
    );
  }

  /**
   * 使用 embedding 向量進行搜尋
   */
  async searchWithEmbedding(
    queryEmbedding: number[],
    options: Partial<SearchOptions> = {}
  ): Promise<SearchResult[]> {
    this.ensureInitialized();

    const topK = options.topK || 5;
    const scoreThreshold = options.scoreThreshold || 0;

    // Vectra 搜尋 (API: queryItems(vector, query, topK, filter?, isBm25?))
    // 純向量搜尋使用空字串 query
    const results = await this.index!.queryItems(queryEmbedding, "", topK);

    // 轉換結果格式並應用 score threshold
    const searchResults: SearchResult[] = results
      .filter((result) => result.score >= scoreThreshold)
      .map((result) => {
        const metadata = result.item.metadata || {};
        const content = metadata.content as string || '';

        // 移除 content 欄位（已提取）
        const { content: _, ...restMetadata } = metadata;

        return {
          id: result.item.id,
          content,
          metadata: restMetadata as unknown as DocumentMetadata,
          score: result.score,
          distance: 1 - result.score, // Convert similarity to distance
        };
      });

    return searchResults;
  }

  /**
   * 取得文檔數量
   */
  async count(): Promise<number> {
    this.ensureInitialized();
    return await this.index!.listItemsByMetadata({}).then((items) => items.length);
  }

  /**
   * 刪除文檔
   */
  async delete(ids: string[]): Promise<void> {
    this.ensureInitialized();

    for (const id of ids) {
      await this.index!.deleteItem(id);
    }
  }

  /**
   * 清空 collection
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

    // Vectra 沒有直接清空的方法，需要刪除所有項目
    const allItems = await this.index!.listItems();

    for (const item of allItems) {
      await this.index!.deleteItem(item.id);
    }

    console.log(`VectorStore cleared`);
  }

  /**
   * 取得 collection 資訊
   */
  async getCollectionInfo(): Promise<{
    name: string;
    count: number;
    metadata: Record<string, any>;
  }> {
    this.ensureInitialized();

    const count = await this.count();

    return {
      name: 'local_vectorstore',
      count,
      metadata: {
        path: this.dataPath,
        embeddingModel: this.config.embeddingModel,
        embeddingDimension: this.config.embeddingDimension,
      },
    };
  }

  /**
   * 檢查連接狀態（本地模式始終可用）
   */
  async healthCheck(): Promise<boolean> {
    try {
      return this.isInitialized && this.index !== null;
    } catch (error) {
      logger.error('VectorStore health check failed', { error });
      return false;
    }
  }

  /**
   * 工具方法：生成唯一 ID
   */
  private generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 工具方法：清理 metadata（Vectra 支持任意 JSON）
   */
  private sanitizeMetadata(metadata: DocumentMetadata): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * 工具方法：分批處理
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * 關閉連接
   */
  async close(): Promise<void> {
    this.isInitialized = false;
    this.index = null;
    console.log('VectorStore closed');
  }
}
