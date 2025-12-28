/**
 * HuggingFace Inference API Embeddings 整合
 * 
 * 提供免費的 embedding 服務作為 OpenAI 的替代方案
 * API 文檔: https://huggingface.co/docs/api-inference/
 */

import { logger } from '../../utils/logger.js';
import type { CostTracker } from './types.js';

/**
 * HuggingFace Inference API Response
 */
interface HFEmbeddingResponse {
  embeddings?: number[][];
  error?: string;
}

/**
 * HuggingFace 熱門 Embedding 模型
 */
export const HF_EMBEDDING_MODELS = {
  'all-MiniLM-L6-v2': 'sentence-transformers/all-MiniLM-L6-v2', // 輕量，384維
  'all-mpnet-base-v2': 'sentence-transformers/all-mpnet-base-v2', // 高品質，768維
  'bge-small-en-v1.5': 'BAAI/bge-small-en-v1.5', // 多語言，384維
  'bge-base-en-v1.5': 'BAAI/bge-base-en-v1.5', // 平衡，768維
} as const;

export class HuggingFaceEmbeddingService {
  private apiKey: string | undefined;
  private model: string;
  private costTracker: CostTracker;
  private baseUrl: string = 'https://router.huggingface.co/hf-inference/models';

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY;
    this.model = model || process.env.HUGGINGFACE_MODEL || HF_EMBEDDING_MODELS['all-MiniLM-L6-v2'];
    this.costTracker = {
      embeddingCalls: 0,
      totalTokens: 0,
      estimatedCost: 0, // HuggingFace 免費層無成本
      lastUpdated: new Date(),
    };
  }

  /**
   * Check if service is available (has API key)
   */
  isAvailable(): boolean {
    return this.apiKey !== undefined;
  }

  /**
   * 生成單個文本的 embedding
   */
  async createEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error(
        'HuggingFace API key not provided. ' +
        'Please set HUGGINGFACE_API_KEY environment variable.'
      );
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.model}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          options: {
            wait_for_model: true, // 等待模型載入（首次請求可能較慢）
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as number[] | HFEmbeddingResponse;

      // HF API 可能返回不同格式
      let embedding: number[];
      if (Array.isArray(data)) {
        embedding = data;
      } else if (data.embeddings && Array.isArray(data.embeddings[0])) {
        embedding = data.embeddings[0];
      } else {
        throw new Error('Unexpected HuggingFace API response format');
      }

      // 更新追蹤指標
      this.costTracker.embeddingCalls++;
      this.costTracker.totalTokens += Math.ceil(text.length / 4); // 粗略估算
      this.costTracker.estimatedCost = 0; // 免費層
      this.costTracker.lastUpdated = new Date();

      logger.debug('HuggingFace embedding created', {
        model: this.model,
        textLength: text.length,
        embeddingDim: embedding.length,
      });

      return embedding;
    } catch (error) {
      logger.error('Failed to create HuggingFace embedding', { error });
      throw error;
    }
  }

  /**
   * 批量生成 embeddings
   */
  async createEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('HuggingFace API key not provided');
    }

    try {
      const response = await fetch(`${this.baseUrl}/${this.model}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: texts,
          options: {
            wait_for_model: true,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${error}`);
      }

      const data = await response.json() as number[][] | HFEmbeddingResponse;

      let embeddings: number[][];
      if (Array.isArray(data) && Array.isArray(data[0])) {
        embeddings = data as number[][];
      } else if ('embeddings' in data && data.embeddings) {
        embeddings = data.embeddings;
      } else {
        throw new Error('Unexpected HuggingFace API response format');
      }

      // 更新追蹤指標
      this.costTracker.embeddingCalls += texts.length;
      this.costTracker.totalTokens += texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);
      this.costTracker.estimatedCost = 0;
      this.costTracker.lastUpdated = new Date();

      logger.debug('HuggingFace batch embeddings created', {
        model: this.model,
        count: texts.length,
        embeddingDim: embeddings[0]?.length,
      });

      return embeddings;
    } catch (error) {
      logger.error('Failed to create HuggingFace batch embeddings', { error });
      throw error;
    }
  }

  /**
   * 取得成本追蹤資訊
   */
  getCostTracker(): CostTracker {
    return { ...this.costTracker };
  }

  /**
   * 取得模型資訊
   */
  getModelInfo(): { provider: string; model: string; dimensions: number } {
    // 根據模型返回對應的維度
    const dimensionsMap: Record<string, number> = {
      [HF_EMBEDDING_MODELS['all-MiniLM-L6-v2']]: 384,
      [HF_EMBEDDING_MODELS['all-mpnet-base-v2']]: 768,
      [HF_EMBEDDING_MODELS['bge-small-en-v1.5']]: 384,
      [HF_EMBEDDING_MODELS['bge-base-en-v1.5']]: 768,
    };

    return {
      provider: 'huggingface',
      model: this.model,
      dimensions: dimensionsMap[this.model] || 768,
    };
  }
}
