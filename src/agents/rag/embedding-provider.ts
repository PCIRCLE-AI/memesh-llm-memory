/**
 * Embedding Provider - OpenAI Embeddings Only
 *
 * Simplified to use only OpenAI embeddings API for stability and reliability
 */

import { EmbeddingService } from './embeddings.js';
import { logger } from '../../utils/logger.js';
import type { CostTracker } from './types.js';
import * as readline from 'readline';
import { SecureKeyStore } from '../../utils/SecureKeyStore.js';
import { ConfigurationError } from '../../errors/index.js';

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
 * RAG 功能說明
 */
const RAG_BENEFITS = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                    🧠 Smart-Agents RAG Features                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

啟用 RAG (Retrieval-Augmented Generation) 功能將為您的 AI agents 帶來：

✨ 核心優勢：
  • 📚 知識庫管理：索引並搜尋大量文檔、代碼庫、筆記
  • 🔍 語義搜尋：基於含義而非關鍵字的智能搜尋
  • 🎯 精準檢索：快速找到最相關的資訊片段
  • 💡 上下文增強：為 AI 回應提供準確的背景知識
  • 📊 批次處理：高效處理數千份文件

🚀 實際應用場景：
  • 代碼庫問答：「這個專案如何處理認證？」
  • 文檔查詢：「我們的 API 限流策略是什麼？」
  • 知識管理：建立個人/團隊知識庫
  • 技術研究：快速搜尋相關技術文檔

💰 成本：
  • OpenAI Embeddings: $0.02 / 1M tokens
  • 約等於 62,500 頁文本
  • 非常實惠的投資

═══════════════════════════════════════════════════════════════════════════

需要 OpenAI API Key 來啟用此功能。
取得免費試用額度：https://platform.openai.com/signup
`;

/**
 * 互動式提示取得 API Key
 */
async function promptForApiKey(): Promise<string | null> {
  console.log(RAG_BENEFITS);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n請輸入您的 OpenAI API Key (或按 Enter 跳過): ', (answer) => {
      rl.close();
      const apiKey = answer.trim();

      if (!apiKey) {
        console.log('\n⚠️  跳過 RAG 功能設定。');
        console.log('   您可以稍後設定 OPENAI_API_KEY 環境變數來啟用。\n');
        resolve(null);
      } else if (apiKey.startsWith('sk-')) {
        console.log('\n✅ API Key 已設定！');
        console.log('   💡 建議：將此 key 加入 .env 檔案以長期使用\n');
        resolve(apiKey);
      } else {
        console.log('\n❌ 無效的 API Key 格式（應該以 "sk-" 開頭）\n');
        resolve(null);
      }
    });
  });
}

/**
 * Embedding Provider Factory
 *
 * 僅支援 OpenAI embeddings（穩定可靠）
 */
export class EmbeddingProviderFactory {
  /**
   * 創建 embedding provider
   *
   * 如果沒有 API key，會提示使用者輸入
   */
  static async create(options: {
    apiKey?: string;
    interactive?: boolean;
  } = {}): Promise<IEmbeddingProvider> {
    // Check SecureKeyStore first, then process.env, then provided apiKey
    let apiKey = options.apiKey || SecureKeyStore.get('openai') || process.env.OPENAI_API_KEY;

    // 如果沒有 API key 且允許互動模式
    if (!apiKey && options.interactive) {
      apiKey = await promptForApiKey() || undefined;

      // 如果使用者提供了 key，安全儲存到記憶體（不修改 process.env）
      if (apiKey) {
        SecureKeyStore.set('openai', apiKey);
      }
    }

    const openaiService = new EmbeddingService(apiKey);

    if (openaiService.isAvailable()) {
      logger.info('Using OpenAI Embeddings API for RAG');
      return openaiService;
    }

    // 無可用 provider
    const errorMessage = options.interactive
      ? 'OpenAI API key is required for RAG features. Please provide a valid API key.'
      : 'OpenAI API key not found. Please set OPENAI_API_KEY environment variable or pass apiKey parameter.';

    throw new ConfigurationError(
      errorMessage + '\n\nGet your API key at: https://platform.openai.com/api-keys',
      {
        configKey: 'OPENAI_API_KEY',
        provider: 'OpenAI',
        interactive: options.interactive,
        apiKeyUrl: 'https://platform.openai.com/api-keys',
      }
    );
  }

  /**
   * 同步版本（不提示，僅檢查環境變數）
   *
   * @param options.apiKey - Optional API key
   * @param options.optional - If true, returns null instead of throwing when no key available
   */
  static createSync(options: { apiKey?: string; optional?: boolean } = {}): IEmbeddingProvider | null {
    // Check SecureKeyStore first, then process.env, then provided apiKey
    const key = options.apiKey || SecureKeyStore.get('openai') || process.env.OPENAI_API_KEY;
    const openaiService = new EmbeddingService(key);

    if (openaiService.isAvailable()) {
      logger.info('Using OpenAI Embeddings API for RAG');
      return openaiService;
    }

    // If optional, return null instead of throwing
    if (options.optional) {
      logger.info('RAG features disabled (no OpenAI API key configured)');
      return null;
    }

    throw new ConfigurationError(
      'OpenAI API key not found. Please set OPENAI_API_KEY environment variable.\n' +
      'Get your API key at: https://platform.openai.com/api-keys',
      {
        configKey: 'OPENAI_API_KEY',
        provider: 'OpenAI',
        method: 'createSync',
        apiKeyUrl: 'https://platform.openai.com/api-keys',
      }
    );
  }

  /**
   * 檢查 OpenAI provider 是否可用
   */
  static isAvailable(): boolean {
    return new EmbeddingService().isAvailable();
  }
}
