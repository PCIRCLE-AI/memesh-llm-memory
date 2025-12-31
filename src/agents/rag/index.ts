/**
 * Advanced RAG Agent - 主入口
 */

import { VectorStore } from './vectorstore.js';
import { EmbeddingProviderFactory, type IEmbeddingProvider } from './embedding-provider.js';
import { Reranker } from './reranker.js';
import type {
  DocumentInput,
  SearchResult,
  SearchOptions,
  HybridSearchOptions,
  BatchOptions,
  EmbeddingStats,
  DocumentMetadata,
} from './types.js';
import { StateError, ConfigurationError } from '../../errors/index.js';

export class RAGAgent {
  private vectorStore: VectorStore;
  private embeddings: IEmbeddingProvider | null;
  private reranker: Reranker;
  private isInitialized = false;

  constructor() {
    this.vectorStore = new VectorStore();
    // Try to create embeddings provider, but don't fail if no API key
    this.embeddings = EmbeddingProviderFactory.createSync({ optional: true });
    this.reranker = new Reranker();
  }

  /**
   * Check if RAG features are enabled
   */
  isRAGEnabled(): boolean {
    return this.embeddings !== null;
  }

  /**
   * Enable RAG features by providing OpenAI API key
   * This will prompt the user interactively for the API key
   */
  async enableRAG(apiKey?: string): Promise<boolean> {
    if (this.embeddings !== null) {
      console.log('✅ RAG features are already enabled');
      return true;
    }

    try {
      this.embeddings = await EmbeddingProviderFactory.create({
        apiKey,
        interactive: !apiKey, // Only prompt if no key provided
      });
      console.log('✅ RAG features enabled successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to enable RAG features:', error);
      return false;
    }
  }

  /**
   * 初始化 RAG Agent
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('RAG Agent already initialized');
      return;
    }

    console.log('Initializing RAG Agent...');

    // 初始化 vector store
    await this.vectorStore.initialize();

    // 檢查健康狀態
    const isHealthy = await this.vectorStore.healthCheck();
    if (!isHealthy) {
      throw new StateError(
        'Vector store health check failed during RAG Agent initialization',
        {
          component: 'RAGAgent',
          operation: 'initialize',
          vectorStoreStatus: 'unhealthy',
        }
      );
    }

    this.isInitialized = true;
    console.log('RAG Agent initialized successfully');

    // 顯示統計資訊
    await this.printStats();
  }

  /**
   * 索引單個文檔
   */
  async indexDocument(
    content: string,
    metadata: DocumentMetadata,
    id?: string
  ): Promise<void> {
    this.ensureInitialized();
    this.ensureRAGEnabled();

    // 生成 embedding
    const embedding = await this.embeddings!.createEmbedding(content);

    // 添加到 vector store
    await this.vectorStore.addDocument({
      id,
      content,
      metadata,
      embedding,
    });

    console.log(`Document indexed: ${metadata.source}`);
  }

  /**
   * 批次索引文檔（支援大量文檔）
   */
  async indexDocuments(
    documents: Array<{
      content: string;
      metadata: DocumentMetadata;
      id?: string;
    }>,
    options: Partial<BatchOptions> = {}
  ): Promise<EmbeddingStats> {
    this.ensureInitialized();
    this.ensureRAGEnabled();

    const batchSize = options.batchSize || 100;
    const maxConcurrent = options.maxConcurrent || 5;
    const onProgress = options.onProgress;

    console.log(`Indexing ${documents.length} documents...`);
    console.log(`Batch size: ${batchSize}, Max concurrent: ${maxConcurrent}`);

    const startTime = Date.now();
    let processedCount = 0;

    // 分批處理
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);

      // 批次生成 embeddings
      const contents = batch.map((d) => d.content);
      const embeddings = await this.embeddings!.createEmbeddings(contents);

      // 準備文檔輸入
      const docsToAdd: DocumentInput[] = batch.map((doc, index) => ({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        embedding: embeddings[index],
      }));

      // 添加到 vector store
      await this.vectorStore.addDocuments(docsToAdd);

      processedCount += batch.length;

      // 進度回調
      if (onProgress) {
        onProgress(processedCount, documents.length);
      }

      console.log(`Progress: ${processedCount}/${documents.length} documents`);
    }

    const duration = (Date.now() - startTime) / 1000;
    const costTracker = this.embeddings!.getCostTracker();

    const stats: EmbeddingStats = {
      totalDocuments: documents.length,
      totalTokens: costTracker.totalTokens,
      totalCost: costTracker.estimatedCost,
      averageTokensPerDocument: Math.round(costTracker.totalTokens / documents.length),
    };

    console.log('\n=== Indexing Complete ===');
    console.log(`Total documents: ${stats.totalDocuments}`);
    console.log(`Total tokens: ${stats.totalTokens.toLocaleString()}`);
    console.log(`Total cost: $${stats.totalCost.toFixed(4)}`);
    console.log(`Avg tokens/doc: ${stats.averageTokensPerDocument}`);
    console.log(`Duration: ${duration.toFixed(2)}s`);
    console.log(`Throughput: ${(documents.length / duration).toFixed(2)} docs/sec`);

    return stats;
  }

  /**
   * 語義搜尋
   */
  async search(query: string, options: Partial<SearchOptions> = {}): Promise<SearchResult[]> {
    this.ensureInitialized();
    this.ensureRAGEnabled();

    console.log(`Searching: "${query}"`);

    // 生成 query embedding
    const queryEmbedding = await this.embeddings!.createEmbedding(query);

    // 執行搜尋
    const results = await this.vectorStore.searchWithEmbedding(queryEmbedding, options);

    console.log(`Found ${results.length} results`);

    return results;
  }

  /**
   * Hybrid 搜尋（結合語義 + 關鍵字）
   */
  async hybridSearch(
    query: string,
    options: Partial<HybridSearchOptions> = {}
  ): Promise<SearchResult[]> {
    this.ensureInitialized();

    const semanticWeight = options.semanticWeight || 0.7;
    const keywordWeight = options.keywordWeight || 0.3;
    const keywords = options.keywords || this.extractKeywords(query);

    console.log(`Hybrid search: "${query}"`);
    console.log(`Keywords: ${keywords.join(', ')}`);

    // 1. 語義搜尋
    const semanticResults = await this.search(query, {
      topK: (options.topK || 10) * 2, // 獲取更多結果用於融合
    });

    // 2. 關鍵字增強
    const keywordBoostedResults = this.reranker.keywordBoost(semanticResults, keywords);

    // 3. 結合兩種評分
    const hybridResults = keywordBoostedResults.map((result) => ({
      ...result,
      score: result.score * semanticWeight + result.score * keywordWeight,
    }));

    // 4. 重新排序並取前 K 個
    const topK = options.topK || 5;
    const finalResults = hybridResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`Hybrid search complete: ${finalResults.length} results`);

    return finalResults;
  }

  /**
   * 搜尋並重排序
   */
  async searchWithRerank(
    query: string,
    options: Partial<SearchOptions & { rerankAlgorithm?: 'reciprocal-rank' | 'score-fusion' }> = {}
  ): Promise<SearchResult[]> {
    this.ensureInitialized();

    // 執行搜尋
    const results = await this.search(query, {
      ...options,
      topK: (options.topK || 10) * 2, // 獲取更多結果用於重排序
    });

    // 重排序
    const rerankedResults = this.reranker.rerank(results, query, {
      algorithm: options.rerankAlgorithm || 'reciprocal-rank',
    });

    // 去重複
    const dedupedResults = this.reranker.deduplicate(rerankedResults);

    // 多樣性重排序
    const diverseResults = this.reranker.diversityRerank(dedupedResults);

    // 取前 K 個
    const topK = options.topK || 5;
    return diverseResults.slice(0, topK);
  }

  /**
   * 取得統計資訊
   */
  async getStats(): Promise<{
    documentCount: number;
    embeddingStats: EmbeddingStats;
    collectionInfo: {
      name: string;
      count: number;
      metadata: Record<string, any>;
    };
  }> {
    this.ensureInitialized();
    this.ensureRAGEnabled();

    const documentCount = await this.vectorStore.count();
    const costTracker = this.embeddings!.getCostTracker();
    const collectionInfo = await this.vectorStore.getCollectionInfo();

    const embeddingStats: EmbeddingStats = {
      totalDocuments: documentCount,
      totalTokens: costTracker.totalTokens,
      totalCost: costTracker.estimatedCost,
      averageTokensPerDocument:
        documentCount > 0 ? Math.round(costTracker.totalTokens / documentCount) : 0,
    };

    return {
      documentCount,
      embeddingStats,
      collectionInfo,
    };
  }

  /**
   * 刪除文檔
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    this.ensureInitialized();
    await this.vectorStore.delete(ids);
    console.log(`Deleted ${ids.length} documents`);
  }

  /**
   * 清空所有文檔
   */
  async clearAll(): Promise<void> {
    this.ensureInitialized();
    await this.vectorStore.clear();
    this.reranker.clearCache();
    console.log('All documents cleared');
  }

  /**
   * 關閉 RAG Agent
   */
  async close(): Promise<void> {
    await this.vectorStore.close();
    this.isInitialized = false;
    console.log('RAG Agent closed');
  }

  /**
   * 內部方法：確保已初始化
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new StateError(
        'RAG Agent not initialized. Call initialize() first.',
        {
          component: 'RAGAgent',
          operation: 'ensureInitialized',
          isInitialized: false,
        }
      );
    }
  }

  /**
   * 內部方法：確保 RAG 功能已啟用
   */
  private ensureRAGEnabled(): void {
    if (this.embeddings === null) {
      throw new ConfigurationError(
        'RAG features are not enabled. Please provide OpenAI API key.\n' +
        'Use enableRAG() method or set OPENAI_API_KEY environment variable.\n' +
        'Get your API key at: https://platform.openai.com/api-keys',
        {
          configKey: 'OPENAI_API_KEY',
          provider: 'OpenAI',
          component: 'RAGAgent',
          apiKeyUrl: 'https://platform.openai.com/api-keys',
        }
      );
    }
  }

  /**
   * 內部方法：提取關鍵字（簡化版）
   */
  private extractKeywords(query: string): string[] {
    // 移除停用詞並分割
    const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一個', '上', '也', '很', '到', '說', '要', '去', '你', '會', '著', '沒有', '看', '好', '自己', '這']);

    const words = query
      .split(/[\s,，。、]+/)
      .filter((word) => word.length > 1 && !stopWords.has(word));

    return words;
  }

  /**
   * 內部方法：顯示統計資訊
   */
  private async printStats(): Promise<void> {
    if (!this.isRAGEnabled()) {
      console.log('\n=== RAG Agent Status ===');
      console.log('RAG features: ❌ Disabled (no OpenAI API key)');
      console.log('Tip: Use enableRAG() to enable RAG features');
      console.log('========================\n');
      return;
    }

    const stats = await this.getStats();
    const modelInfo = this.embeddings!.getModelInfo();
    console.log('\n=== RAG Agent Status ===');
    console.log(`Collection: ${stats.collectionInfo.name}`);
    console.log(`Documents: ${stats.documentCount}`);
    console.log(`Embedding provider: ${modelInfo.provider}`);
    console.log(`Embedding model: ${modelInfo.model}`);
    console.log(`Embedding dimension: ${modelInfo.dimensions}`);
    console.log('========================\n');
  }
}

/**
 * 創建 RAG Agent 單例
 */
let ragAgentInstance: RAGAgent | null = null;

export async function getRAGAgent(): Promise<RAGAgent> {
  if (!ragAgentInstance) {
    ragAgentInstance = new RAGAgent();
    await ragAgentInstance.initialize();
  }
  return ragAgentInstance;
}

// 匯出類型和組件
export { VectorStore, EmbeddingProviderFactory, Reranker };
export { FileWatcher } from './FileWatcher.js';
export type {
  DocumentInput,
  SearchResult,
  SearchOptions,
  HybridSearchOptions,
  BatchOptions,
  EmbeddingStats,
  DocumentMetadata,
  IEmbeddingProvider,
};
