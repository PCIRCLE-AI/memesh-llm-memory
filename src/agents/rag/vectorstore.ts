/**
 * ChromaDB Vector Store 封裝
 */

import { ChromaClient, Collection } from 'chromadb';
import { appConfig } from '../../config/index.js';
import type {
  DocumentInput,
  SearchResult,
  SearchOptions,
  RAGConfig,
  DocumentMetadata,
} from './types.js';

export class VectorStore {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private config: RAGConfig;
  private isInitialized = false;

  constructor(config?: Partial<RAGConfig>) {
    this.config = {
      chromaHost: config?.chromaHost || appConfig.chroma.host,
      chromaPort: config?.chromaPort || appConfig.chroma.port,
      chromaUrl: config?.chromaUrl || appConfig.chroma.url,
      collectionName: config?.collectionName || appConfig.chroma.collectionName,
      embeddingModel: config?.embeddingModel || appConfig.openai.embeddings.model,
      embeddingDimension: config?.embeddingDimension || 1536,
      maxBatchSize: config?.maxBatchSize || 100,
      cacheEnabled: config?.cacheEnabled ?? true,
    };

    this.client = new ChromaClient({
      path: this.config.chromaUrl,
    });
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
      // 測試連接
      await this.client.heartbeat();
      console.log(`Connected to ChromaDB at ${this.config.chromaUrl}`);

      // 獲取或創建 collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.config.collectionName,
        metadata: {
          'hnsw:space': 'cosine',
          description: 'Smart Agents Knowledge Base',
          embeddingModel: this.config.embeddingModel,
          createdAt: new Date().toISOString(),
        },
      });

      this.isInitialized = true;
      console.log(`Collection '${this.config.collectionName}' ready`);
    } catch (error) {
      logger.error('Failed to initialize VectorStore', { error });
      throw new Error(`VectorStore initialization failed: ${error}`);
    }
  }

  /**
   * 確保已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.collection) {
      throw new Error('VectorStore not initialized. Call initialize() first.');
    }
  }

  /**
   * 添加單個文檔
   */
  async addDocument(doc: DocumentInput): Promise<void> {
    this.ensureInitialized();

    if (!doc.embedding) {
      throw new Error('Document must have embedding');
    }

    const id = doc.id || this.generateId();

    await this.collection!.add({
      ids: [id],
      embeddings: [doc.embedding],
      documents: [doc.content],
      metadatas: [this.sanitizeMetadata(doc.metadata)],
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
      throw new Error(`${missingEmbeddings.length} documents missing embeddings`);
    }

    // 分批處理
    const batches = this.createBatches(docs, this.config.maxBatchSize);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length} (${batch.length} docs)`);

      const ids = batch.map((doc) => doc.id || this.generateId());
      const embeddings = batch.map((doc) => doc.embedding!);
      const documents = batch.map((doc) => doc.content);
      const metadatas = batch.map((doc) => this.sanitizeMetadata(doc.metadata));

      await this.collection!.add({
        ids,
        embeddings,
        documents,
        metadatas,
      });
    }

    console.log(`Successfully added ${docs.length} documents`);
  }

  /**
   * 語義搜尋
   */
  async search(_options: SearchOptions): Promise<SearchResult[]> {
    this.ensureInitialized();

    // 注意：這裡需要外部提供 query embedding
    // 實際使用時應該先通過 EmbeddingService 生成 query embedding
    throw new Error('Use searchWithEmbedding() instead. Generate query embedding first.');
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
    const filter = options.filter || undefined;

    const results = await this.collection!.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      where: filter,
      include: ['documents', 'metadatas', 'distances'] as any,
    });

    // 轉換結果格式
    const searchResults: SearchResult[] = [];

    if (results.ids && results.ids[0]) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const distance = results.distances?.[0]?.[i] ?? 1;
        const score = 1 - distance; // Convert distance to similarity score

        // 應用 score threshold 過濾
        if (options.scoreThreshold && score < options.scoreThreshold) {
          continue;
        }

        searchResults.push({
          id: results.ids[0][i],
          content: results.documents?.[0]?.[i] as string || '',
          metadata: (results.metadatas?.[0]?.[i] || { source: 'unknown', language: 'zh-TW' }) as unknown as DocumentMetadata,
          score,
          distance,
        });
      }
    }

    return searchResults;
  }

  /**
   * 取得文檔數量
   */
  async count(): Promise<number> {
    this.ensureInitialized();
    return await this.collection!.count();
  }

  /**
   * 刪除文檔
   */
  async delete(ids: string[]): Promise<void> {
    this.ensureInitialized();
    await this.collection!.delete({ ids });
  }

  /**
   * 清空 collection
   */
  async clear(): Promise<void> {
    this.ensureInitialized();

    // 刪除並重新創建 collection
    await this.client.deleteCollection({ name: this.config.collectionName });

    this.collection = await this.client.createCollection({
      name: this.config.collectionName,
      metadata: {
        'hnsw:space': 'cosine',
        description: 'Smart Agents Knowledge Base',
        embeddingModel: this.config.embeddingModel,
        createdAt: new Date().toISOString(),
      },
    });

    console.log(`Collection '${this.config.collectionName}' cleared`);
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

    const count = await this.collection!.count();
    const metadata = this.collection!.metadata;

    return {
      name: this.config.collectionName,
      count,
      metadata: metadata || {},
    };
  }

  /**
   * 檢查連接狀態
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat();
      return true;
    } catch (error) {
      logger.error('ChromaDB health check failed', { error });
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
   * 工具方法：清理 metadata（移除 undefined 值）
   */
  private sanitizeMetadata(metadata: DocumentMetadata): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (value !== undefined && value !== null) {
        // ChromaDB v2 API only accepts primitive types (string, number, boolean)
        // Convert arrays to comma-separated strings
        if (Array.isArray(value)) {
          sanitized[key] = value.join(', ');
        } else if (typeof value === 'object') {
          // Convert objects to JSON strings
          sanitized[key] = JSON.stringify(value);
        } else {
          sanitized[key] = value;
        }
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
    // ChromaDB client 不需要明確關閉
    this.isInitialized = false;
    this.collection = null;
    console.log('VectorStore closed');
  }
}
