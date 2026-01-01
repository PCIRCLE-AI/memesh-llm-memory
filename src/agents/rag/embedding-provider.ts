/**
 * Embedding Provider Factory
 *
 * Supports multiple embedding providers:
 * - OpenAI (default, stable and reliable)
 * - Hugging Face (alternative cloud provider)
 * - Ollama (local inference)
 * - Local (offline with transformers.js)
 */

import { EmbeddingService } from './embeddings.js';
import { logger } from '../../utils/logger.js';
import type { CostTracker, IEmbeddingProvider as IEmbeddingProviderNew, EmbeddingProviderConfig } from './types.js';
import * as readline from 'readline';
import { SecureKeyStore } from '../../utils/SecureKeyStore.js';
import { ConfigurationError } from '../../errors/index.js';
import { HuggingFaceProvider } from './providers/HuggingFaceProvider.js';
import { OllamaProvider } from './providers/OllamaProvider.js';
import { LocalProvider } from './providers/LocalProvider.js';

/**
 * Validate API key is a non-empty string
 *
 * @param apiKey - API key to validate (can be undefined/null)
 * @param providerName - Name of the provider (for error messages)
 * @param setupHints - Additional setup hints for the error message
 * @returns Validated and trimmed API key
 * @throws ConfigurationError if API key is invalid
 */
function validateApiKey(
  apiKey: string | undefined | null,
  providerName: string,
  setupHints: {
    configKey: string;
    envVar?: string;
    apiKeyUrl?: string;
  }
): string {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    const envVarHint = setupHints.envVar
      ? `Set ${setupHints.envVar} environment variable or configure in SecureKeyStore`
      : `Configure in SecureKeyStore or pass as parameter`;

    const urlHint = setupHints.apiKeyUrl
      ? `\n\nGet your API key at: ${setupHints.apiKeyUrl}`
      : '';

    throw new ConfigurationError(
      `${providerName} API key is required for RAG functionality${urlHint}`,
      {
        configKey: setupHints.configKey,
        envVar: setupHints.envVar,
        hint: envVarHint,
        apiKeyUrl: setupHints.apiKeyUrl,
      }
    );
  }

  return apiKey.trim();
}

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
║                    🧠 Claude Code Buddy RAG Features                      ║
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
  logger.info(RAG_BENEFITS);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('\n請輸入您的 OpenAI API Key (或按 Enter 跳過): ', (answer) => {
      rl.close();
      const apiKey = answer.trim();

      if (!apiKey) {
        logger.info('\n⚠️  跳過 RAG 功能設定。');
        logger.info('   您可以稍後設定 OPENAI_API_KEY 環境變數來啟用。\n');
        resolve(null);
      } else if (apiKey.startsWith('sk-')) {
        logger.info('\n✅ API Key 已設定！');
        logger.info('   💡 建議：將此 key 加入 .env 檔案以長期使用\n');
        resolve(apiKey);
      } else {
        logger.info('\n❌ 無效的 API Key 格式（應該以 "sk-" 開頭）\n');
        resolve(null);
      }
    });
  });
}

/**
 * Embedding Provider Factory
 *
 * Creates embedding providers based on configuration.
 * Supports: OpenAI, Hugging Face, Ollama, Local
 */
export class EmbeddingProviderFactory {
  /**
   * Create embedding provider from configuration
   *
   * @param config - Provider configuration with discriminated union type
   * @returns Embedding provider instance
   */
  static async create(config: EmbeddingProviderConfig): Promise<IEmbeddingProviderNew> {
    switch (config.provider) {
      case 'openai': {
        // Check SecureKeyStore first, then provided apiKey
        const rawApiKey = config.apiKey || SecureKeyStore.get('openai') || process.env.OPENAI_API_KEY;

        // Validate API key is a non-empty string
        const apiKey = validateApiKey(rawApiKey, 'OpenAI', {
          configKey: 'apiKey',
          envVar: 'OPENAI_API_KEY',
          apiKeyUrl: 'https://platform.openai.com/api-keys',
        });

        const openaiService = new EmbeddingService(apiKey);
        if (!openaiService.isAvailable()) {
          throw new ConfigurationError('OpenAI service is not available with provided API key', {
            provider: 'OpenAI',
          });
        }

        logger.info('Using OpenAI Embeddings API for RAG');
        return openaiService;
      }

      case 'huggingface': {
        // Validate API key is a non-empty string
        const apiKey = validateApiKey(config.apiKey, 'Hugging Face', {
          configKey: 'apiKey',
          envVar: 'HUGGINGFACE_API_KEY',
          apiKeyUrl: 'https://huggingface.co/settings/tokens',
        });

        logger.info('Using Hugging Face Embeddings API for RAG', {
          model: config.model || 'sentence-transformers/all-MiniLM-L6-v2',
        });

        return new HuggingFaceProvider({
          apiKey,
          model: config.model,
          dimensions: config.dimensions,
        });
      }

      case 'ollama': {
        const baseUrl = config.baseUrl || 'http://localhost:11434';

        logger.info('Using Ollama local embeddings for RAG', {
          baseUrl,
          model: config.model || 'nomic-embed-text',
        });

        const provider = new OllamaProvider({
          baseUrl,
          model: config.model,
          dimensions: config.dimensions,
        });

        // Check if Ollama is running
        const isAvailable = await provider.checkAvailability();
        if (!isAvailable) {
          throw new ConfigurationError(
            `Ollama is not running at ${baseUrl}.\n\n` +
            'Please start Ollama: ollama serve\n' +
            'And ensure your model is pulled: ollama pull ' + (config.model || 'nomic-embed-text'),
            {
              provider: 'Ollama',
              baseUrl,
            }
          );
        }

        return provider;
      }

      case 'local': {
        if (!config.modelPath) {
          throw new ConfigurationError(
            'Model path is required for local embedding provider.\n\n' +
            'Please provide the path to a downloaded transformers.js model.',
            {
              provider: 'Local',
              configKey: 'modelPath',
            }
          );
        }

        logger.info('Using local embeddings with transformers.js', {
          modelPath: config.modelPath,
          model: config.model || 'all-MiniLM-L6-v2',
        });

        return new LocalProvider({
          modelPath: config.modelPath,
          model: config.model,
          dimensions: config.dimensions,
        });
      }

      default: {
        throw new ConfigurationError(
          `Unsupported embedding provider: ${(config as any).provider}`,
          {
            provider: (config as any).provider,
            supportedProviders: ['openai', 'huggingface', 'ollama', 'local'],
          }
        );
      }
    }
  }

  /**
   * Legacy method for backward compatibility with OpenAI-only code
   *
   * @deprecated Use create() with EmbeddingProviderConfig instead
   */
  static async createOpenAI(options: {
    apiKey?: string;
    interactive?: boolean;
  } = {}): Promise<IEmbeddingProvider> {
    // Check SecureKeyStore first, then process.env, then provided apiKey
    let rawApiKey = options.apiKey || SecureKeyStore.get('openai') || process.env.OPENAI_API_KEY;

    // 如果沒有 API key 且允許互動模式
    if (!rawApiKey && options.interactive) {
      rawApiKey = await promptForApiKey() || undefined;

      // 如果使用者提供了 key，安全儲存到記憶體（不修改 process.env）
      if (rawApiKey) {
        SecureKeyStore.set('openai', rawApiKey);
      }
    }

    // Validate API key before creating service
    const apiKey = validateApiKey(rawApiKey, 'OpenAI', {
      configKey: 'apiKey',
      envVar: 'OPENAI_API_KEY',
      apiKeyUrl: 'https://platform.openai.com/api-keys',
    });

    const openaiService = new EmbeddingService(apiKey);

    if (openaiService.isAvailable()) {
      logger.info('Using OpenAI Embeddings API for RAG');
      return openaiService;
    }

    // If service is not available even with valid API key, throw error
    throw new ConfigurationError(
      'OpenAI service is not available with the provided API key.\n\n' +
      'Please verify your API key at: https://platform.openai.com/api-keys',
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
    const rawApiKey = options.apiKey || SecureKeyStore.get('openai') || process.env.OPENAI_API_KEY;

    // If optional and no key available, return null early
    if (options.optional && (!rawApiKey || typeof rawApiKey !== 'string' || rawApiKey.trim().length === 0)) {
      logger.info('RAG features disabled (no OpenAI API key configured)');
      return null;
    }

    // Validate API key
    const apiKey = validateApiKey(rawApiKey, 'OpenAI', {
      configKey: 'apiKey',
      envVar: 'OPENAI_API_KEY',
      apiKeyUrl: 'https://platform.openai.com/api-keys',
    });

    const openaiService = new EmbeddingService(apiKey);

    if (openaiService.isAvailable()) {
      logger.info('Using OpenAI Embeddings API for RAG');
      return openaiService;
    }

    // If service is not available even with valid API key, throw error
    throw new ConfigurationError(
      'OpenAI service is not available with the provided API key.\n\n' +
      'Please verify your API key at: https://platform.openai.com/api-keys',
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
