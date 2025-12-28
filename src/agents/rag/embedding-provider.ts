/**
 * Embedding Provider 抽象層
 * 
 * 統一 OpenAI 和 HuggingFace 的接口
 */

import { EmbeddingService } from './embeddings.js';
import { HuggingFaceEmbeddingService } from './huggingface-embeddings.js';
import { logger } from '../../utils/logger.js';
import type { CostTracker } from './types.js';

export type EmbeddingProviderType = 'openai' | 'huggingface';

/**
 * 統一的 Embedding Provider 接口
 */
export interface IEmbeddingProvider {
  isAvailable(): boolean;
  createEmbedding(text: string): Promise<number[]>;
  createEmbeddings(texts: string[]): Promise<number[][]>;
  getCostTracker(): CostTracker;
  getModelInfo(): { provider: string; model: string; dimensions: number };
}

/**
 * Embedding Provider Factory
 * 
 * 根據配置創建對應的 provider
 */
export class EmbeddingProviderFactory {
  /**
   * 創建 embedding provider
   * 
   * 優先順序：
   * 1. 環境變數指定的 provider (EMBEDDING_PROVIDER)
   * 2. HuggingFace（如果有 API key）
   * 3. OpenAI（如果有 API key）
   * 4. 拋出錯誤（無可用 provider）
   */
  static create(preferredProvider?: EmbeddingProviderType): IEmbeddingProvider {
    const envProvider = process.env.EMBEDDING_PROVIDER as EmbeddingProviderType | undefined;
    const provider = preferredProvider || envProvider;

    // 如果指定了 provider，嘗試創建
    if (provider === 'huggingface') {
      const hfService = new HuggingFaceEmbeddingService();
      if (hfService.isAvailable()) {
        logger.info('Using HuggingFace Inference API for embeddings');
        return hfService;
      } else {
        logger.warn('HuggingFace provider requested but API key not found');
      }
    }

    if (provider === 'openai') {
      const openaiService = new EmbeddingService();
      if (openaiService.isAvailable()) {
        logger.info('Using OpenAI API for embeddings');
        return openaiService;
      } else {
        logger.warn('OpenAI provider requested but API key not found');
      }
    }

    // 自動選擇可用的 provider
    logger.info('Auto-detecting available embedding provider...');

    // 優先選擇 HuggingFace（免費）
    const hfService = new HuggingFaceEmbeddingService();
    if (hfService.isAvailable()) {
      logger.info('Auto-selected HuggingFace Inference API (free tier)');
      return hfService;
    }

    // 其次選擇 OpenAI
    const openaiService = new EmbeddingService();
    if (openaiService.isAvailable()) {
      logger.info('Auto-selected OpenAI API for embeddings');
      return openaiService;
    }

    // 無可用 provider
    throw new Error(
      'No embedding provider available. ' +
      'Please set either HUGGINGFACE_API_KEY or OPENAI_API_KEY. ' +
      'HuggingFace is free: https://huggingface.co/settings/tokens'
    );
  }

  /**
   * 列出可用的 providers
   */
  static listAvailableProviders(): Array<{ provider: EmbeddingProviderType; available: boolean }> {
    return [
      {
        provider: 'huggingface',
        available: new HuggingFaceEmbeddingService().isAvailable(),
      },
      {
        provider: 'openai',
        available: new EmbeddingService().isAvailable(),
      },
    ];
  }
}
