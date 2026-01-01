/**
 * 結果重排序（Re-ranking）
 */

import type { SearchResult, RerankOptions } from './types.js';
import { logger } from '../../utils/logger.js';

/**
 * Re-ranker 類別
 */
export class Reranker {
  private cache: Map<string, SearchResult[]> = new Map();

  /**
   * 重排序搜尋結果
   */
  rerank(
    results: SearchResult[],
    query: string,
    options: Partial<RerankOptions> = {}
  ): SearchResult[] {
    const algorithm = options.algorithm || 'reciprocal-rank';
    const cacheKey = options.cacheKey || this.generateCacheKey(query, algorithm);

    // 檢查快取
    if (options.useCache && this.cache.has(cacheKey)) {
      logger.debug('Using cached reranked results');
      return this.cache.get(cacheKey)!;
    }

    let rerankedResults: SearchResult[];

    switch (algorithm) {
      case 'reciprocal-rank':
        rerankedResults = this.reciprocalRankFusion(results);
        break;
      case 'score-fusion':
        rerankedResults = this.scoreFusion(results);
        break;
      case 'llm-rerank':
        // LLM-based reranking 需要外部 LLM 調用
        logger.warn('LLM reranking not implemented, falling back to score fusion');
        rerankedResults = this.scoreFusion(results);
        break;
      default:
        rerankedResults = results;
    }

    // 快取結果
    if (options.useCache) {
      this.cache.set(cacheKey, rerankedResults);
    }

    return rerankedResults;
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   * 適用於合併多個排序列表
   */
  private reciprocalRankFusion(results: SearchResult[]): SearchResult[] {
    const k = 60; // RRF constant

    // 計算每個結果的 RRF score
    const scoredResults = results.map((result, index) => {
      const rank = index + 1;
      const rrfScore = 1 / (k + rank);

      return {
        ...result,
        score: rrfScore,
      };
    });

    // 按 RRF score 排序
    return scoredResults.sort((a, b) => b.score - a.score);
  }

  /**
   * Score Fusion
   * 結合多個評分維度
   */
  private scoreFusion(results: SearchResult[]): SearchResult[] {
    // 正規化分數到 [0, 1]
    const maxScore = Math.max(...results.map((r) => r.score));
    const minScore = Math.min(...results.map((r) => r.score));
    const range = maxScore - minScore;

    if (range === 0) {
      return results; // 所有分數相同，不需要重排序
    }

    const normalizedResults = results.map((result) => {
      const normalizedScore = (result.score - minScore) / range;

      return {
        ...result,
        score: normalizedScore,
      };
    });

    // 按正規化分數排序
    return normalizedResults.sort((a, b) => b.score - a.score);
  }

  /**
   * 基於關鍵字匹配的額外評分
   */
  keywordBoost(results: SearchResult[], keywords: string[]): SearchResult[] {
    if (keywords.length === 0) {
      return results;
    }

    const boostedResults = results.map((result) => {
      let boost = 0;
      const contentLower = result.content.toLowerCase();

      // 計算關鍵字匹配度
      keywords.forEach((keyword) => {
        const keywordLower = keyword.toLowerCase();
        const matches = contentLower.split(keywordLower).length - 1;
        boost += matches * 0.1; // 每次匹配增加 0.1
      });

      return {
        ...result,
        score: result.score * (1 + boost),
      };
    });

    // 重新排序
    return boostedResults.sort((a, b) => b.score - a.score);
  }

  /**
   * 基於元數據的額外評分
   */
  metadataBoost(
    results: SearchResult[],
    preferredMetadata: Partial<Record<keyof SearchResult['metadata'], any>>
  ): SearchResult[] {
    const boostedResults = results.map((result) => {
      let boost = 0;

      // 檢查元數據匹配
      Object.entries(preferredMetadata).forEach(([key, value]) => {
        if (result.metadata[key as keyof typeof result.metadata] === value) {
          boost += 0.2; // 每個匹配的元數據增加 0.2
        }
      });

      return {
        ...result,
        score: result.score * (1 + boost),
      };
    });

    return boostedResults.sort((a, b) => b.score - a.score);
  }

  /**
   * 去重複（基於內容相似度）
   */
  deduplicate(results: SearchResult[]): SearchResult[] {
    const uniqueResults: SearchResult[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      // 使用內容的 hash 作為去重依據
      const contentHash = this.simpleHash(result.content);

      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        uniqueResults.push(result);
      }
    }

    return uniqueResults;
  }

  /**
   * 多樣性重排序
   * 確保結果涵蓋不同主題
   */
  diversityRerank(results: SearchResult[], diversityWeight = 0.3): SearchResult[] {
    if (results.length <= 1) {
      return results;
    }

    const diverseResults: SearchResult[] = [results[0]]; // 保留最高分
    const remaining = results.slice(1);

    while (remaining.length > 0 && diverseResults.length < results.length) {
      let maxDiversityScore = -Infinity;
      let selectedIndex = 0;

      // 找出與已選結果最不相似的下一個結果
      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];

        // 計算與已選結果的平均差異度
        const avgDissimilarity =
          diverseResults.reduce((sum, selected) => {
            return sum + (1 - this.contentSimilarity(candidate.content, selected.content));
          }, 0) / diverseResults.length;

        // 結合原始分數和多樣性
        const diversityScore =
          candidate.score * (1 - diversityWeight) + avgDissimilarity * diversityWeight;

        if (diversityScore > maxDiversityScore) {
          maxDiversityScore = diversityScore;
          selectedIndex = i;
        }
      }

      diverseResults.push(remaining[selectedIndex]);
      remaining.splice(selectedIndex, 1);
    }

    return diverseResults;
  }

  /**
   * 計算內容相似度（簡化版）
   */
  private contentSimilarity(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * 簡單 hash 函數
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * 生成快取鍵
   */
  private generateCacheKey(query: string, algorithm: string): string {
    return `${algorithm}:${this.simpleHash(query)}`;
  }

  /**
   * 清除快取
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * 創建 Reranker 單例
 */
let rerankerInstance: Reranker | null = null;

export function getReranker(): Reranker {
  if (!rerankerInstance) {
    rerankerInstance = new Reranker();
  }
  return rerankerInstance;
}
