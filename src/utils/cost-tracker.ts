/**
 * 成本追蹤工具
 */

import { MODEL_COSTS, type ClaudeModel } from '../config/models.js';
import { appConfig } from '../config/index.js';
import { logger } from './logger.js';

interface UsageRecord {
  timestamp: Date;
  service: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  minutes?: number;
  characters?: number;
  cost: number;
}

class CostTracker {
  private records: UsageRecord[] = [];
  private monthlyBudget: number;
  private alertThreshold: number;

  constructor() {
    this.monthlyBudget = appConfig.costs.monthlyBudget;
    this.alertThreshold = appConfig.costs.alertThreshold;
  }

  /**
   * 追蹤 Claude API 使用
   */
  trackClaude(model: ClaudeModel, inputTokens: number, outputTokens: number) {
    const costs = MODEL_COSTS[model];
    const cost = (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;

    this.addRecord({
      timestamp: new Date(),
      service: 'claude',
      model,
      inputTokens,
      outputTokens,
      cost,
    });

    return cost;
  }

  /**
   * 追蹤 Whisper 使用
   */
  trackWhisper(minutes: number) {
    const cost = minutes * MODEL_COSTS['whisper-1'].perMinute;

    this.addRecord({
      timestamp: new Date(),
      service: 'whisper',
      model: 'whisper-1',
      minutes,
      cost,
    });

    return cost;
  }

  /**
   * 追蹤 TTS 使用
   */
  trackTTS(characters: number) {
    const cost = (characters / 1000) * MODEL_COSTS['tts-1'].per1KChars;

    this.addRecord({
      timestamp: new Date(),
      service: 'tts',
      model: 'tts-1',
      characters,
      cost,
    });

    return cost;
  }

  /**
   * 追蹤 Embeddings 使用
   */
  trackEmbeddings(tokens: number) {
    const cost = (tokens / 1_000_000) * MODEL_COSTS['text-embedding-3-small'].input;

    this.addRecord({
      timestamp: new Date(),
      service: 'embeddings',
      model: 'text-embedding-3-small',
      inputTokens: tokens,
      cost,
    });

    return cost;
  }

  /**
   * 添加記錄並檢查預算
   */
  private addRecord(record: UsageRecord) {
    this.records.push(record);

    // 檢查是否超過預算
    const monthlyTotal = this.getMonthlyTotal();
    if (monthlyTotal > this.monthlyBudget * this.alertThreshold) {
      logger.warn(
        `⚠️ Cost alert: $${monthlyTotal.toFixed(2)} / $${this.monthlyBudget.toFixed(2)} (${((monthlyTotal / this.monthlyBudget) * 100).toFixed(1)}%)`
      );
    }

    if (monthlyTotal > this.monthlyBudget) {
      logger.error(`🚨 Budget exceeded! $${monthlyTotal.toFixed(2)} / $${this.monthlyBudget.toFixed(2)}`);
    }
  }

  /**
   * 獲取本月總成本
   */
  getMonthlyTotal(): number {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.records
      .filter((r) => r.timestamp >= monthStart)
      .reduce((total, r) => total + r.cost, 0);
  }

  /**
   * 獲取詳細報告
   */
  getReport() {
    const monthlyTotal = this.getMonthlyTotal();
    const breakdown = this.records.reduce((acc, r) => {
      acc[r.service] = (acc[r.service] || 0) + r.cost;
      return acc;
    }, {} as Record<string, number>);

    return {
      monthlyTotal,
      budget: this.monthlyBudget,
      remaining: this.monthlyBudget - monthlyTotal,
      percentUsed: (monthlyTotal / this.monthlyBudget) * 100,
      breakdown,
      records: this.records,
    };
  }
}

export const costTracker = new CostTracker();
