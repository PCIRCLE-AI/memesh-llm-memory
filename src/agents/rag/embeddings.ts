/**
 * OpenAI Embeddings 整合
 */

import OpenAI from 'openai';
import { appConfig } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type { CostTracker } from './types.js';
import { ConfigurationError, OperationError, ValidationError } from '../../errors/index.js';

/**
 * Embedding 價格表 (per 1K tokens)
 */
const EMBEDDING_PRICING: Record<string, number> = {
  'text-embedding-3-small': 0.00002, // $0.02 / 1M tokens
  'text-embedding-3-large': 0.00013, // $0.13 / 1M tokens
  'text-embedding-ada-002': 0.0001,  // $0.10 / 1M tokens (legacy)
};

export class EmbeddingService {
  private client: OpenAI | null = null;
  private model: string;
  private costTracker: CostTracker;
  private apiKey: string | undefined;
  private initializationPromise: Promise<void> | null = null;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || appConfig.openai.apiKey;
    this.model = model || appConfig.openai.embeddings.model;
    this.costTracker = {
      embeddingCalls: 0,
      totalTokens: 0,
      estimatedCost: 0,
      lastUpdated: new Date(),
    };

    // Initialize client if API key is available
    if (this.apiKey) {
      this.initializationPromise = this.initialize();
    }
  }

  /**
   * Initialize OpenAI client
   */
  private async initialize(): Promise<void> {
    if (!this.apiKey) return;

    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Check if service is available (has API key)
   */
  isAvailable(): boolean {
    return this.client !== null || this.apiKey !== undefined;
  }

  /**
   * Ensure client is available before API calls
   */
  private async ensureClient(): Promise<OpenAI> {
    // Wait for initialization if in progress
    if (this.initializationPromise) {
      await this.initializationPromise;
    }

    if (!this.client) {
      throw new ConfigurationError(
        'OpenAI API key not provided. Embedding service is unavailable. ' +
        'Please set OPENAI_API_KEY environment variable if you need embedding features.',
        {
          configKey: 'OPENAI_API_KEY',
          provider: 'OpenAI',
          service: 'EmbeddingService',
        }
      );
    }
    return this.client;
  }

  /**
   * 生成單個文本的 embedding
   */
  async createEmbedding(text: string): Promise<number[]> {
    const client = await this.ensureClient();

    try {
      const response = await client.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      });

      // 更新成本追蹤
      const tokens = response.usage.total_tokens;
      this.updateCostTracker(tokens);

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to create embedding', { error });
      throw new OperationError(
        `Embedding creation failed: ${error}`,
        {
          operation: 'createEmbedding',
          model: this.model,
          textLength: text.length,
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * 批次生成 embeddings
   */
  async createEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    const client = await this.ensureClient();

    // OpenAI API 限制：每次最多 2048 個輸入
    const maxBatchSize = 2048;
    const batches: string[][] = [];

    for (let i = 0; i < texts.length; i += maxBatchSize) {
      batches.push(texts.slice(i, i + maxBatchSize));
    }

    const allEmbeddings: number[][] = [];

    for (const batch of batches) {
      try {
        const response = await client.embeddings.create({
          model: this.model,
          input: batch,
          encoding_format: 'float',
        });

        // 更新成本追蹤
        const tokens = response.usage.total_tokens;
        this.updateCostTracker(tokens);

        // 提取 embeddings
        const embeddings = response.data
          .sort((a, b) => a.index - b.index)
          .map((item) => item.embedding);

        allEmbeddings.push(...embeddings);
      } catch (error) {
        logger.error('Failed to create embeddings batch', { error });
        throw new OperationError(
          `Batch embedding creation failed: ${error}`,
          {
            operation: 'createEmbeddingsBatch',
            model: this.model,
            batchSize: batch.length,
            totalTexts: texts.length,
            originalError: error instanceof Error ? error.message : String(error),
          }
        );
      }
    }

    return allEmbeddings;
  }

  /**
   * 計算兩個 embedding 之間的相似度 (cosine similarity)
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new ValidationError(
        'Embedding dimensions must match for cosine similarity calculation',
        {
          dimensionA: a.length,
          dimensionB: b.length,
          expectedDimension: this.getModelDimension(),
        }
      );
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 估算文本的 token 數量 (粗略估計)
   * 實際 token 數量由 OpenAI 計算並在 API 回應中返回
   */
  estimateTokens(text: string): number {
    // 粗略估計：1 token ≈ 4 characters (for English)
    // 中文文本：1 token ≈ 1.5-2 characters
    const avgCharsPerToken = 3; // 考慮中英混合
    return Math.ceil(text.length / avgCharsPerToken);
  }

  /**
   * 估算批次處理的成本
   */
  estimateCost(texts: string[]): number {
    const totalTokens = texts.reduce(
      (sum, text) => sum + this.estimateTokens(text),
      0
    );
    const pricePerToken = EMBEDDING_PRICING[this.model] || 0.0001;
    return (totalTokens / 1000) * pricePerToken;
  }

  /**
   * 更新成本追蹤器
   */
  private updateCostTracker(tokens: number): void {
    this.costTracker.embeddingCalls++;
    this.costTracker.totalTokens += tokens;

    const pricePerToken = EMBEDDING_PRICING[this.model] || 0.0001;
    this.costTracker.estimatedCost = (this.costTracker.totalTokens / 1000) * pricePerToken;
    this.costTracker.lastUpdated = new Date();
  }

  /**
   * 取得成本追蹤資訊
   */
  getCostTracker(): CostTracker {
    return { ...this.costTracker };
  }

  /**
   * 重置成本追蹤器
   */
  resetCostTracker(): void {
    this.costTracker = {
      embeddingCalls: 0,
      totalTokens: 0,
      estimatedCost: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * 取得當前使用的模型
   */
  getModel(): string {
    return this.model;
  }

  /**
   * 取得模型的維度
   */
  getModelDimension(): number {
    const dimensions: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };
    return dimensions[this.model] || 1536;
  }

  /**
   * 統一接口：批量生成 embeddings（別名方法）
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    return this.createEmbeddingsBatch(texts);
  }

  /**
   * 統一接口：取得模型資訊
   */
  getModelInfo(): { provider: string; model: string; dimensions: number } {
    return {
      provider: 'openai',
      model: this.model,
      dimensions: this.getModelDimension(),
    };
  }

  /**
   * IEmbeddingProvider interface implementation
   * Adapter method for new provider interface
   */
  async embed(text: string): Promise<number[]> {
    return this.createEmbedding(text);
  }

  /**
   * IEmbeddingProvider interface implementation
   * Adapter method for new provider interface
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.createEmbeddingsBatch(texts);
  }
}

/**
 * 創建 Embedding Service 單例
 */
let embeddingServiceInstance: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService();
  }
  return embeddingServiceInstance;
}
