import { EmbeddingService } from './embeddings.js';
import { logger } from '../../utils/logger.js';
import * as readline from 'readline';
import { SecureKeyStore } from '../../utils/SecureKeyStore.js';
import { ConfigurationError } from '../../errors/index.js';
import { HuggingFaceProvider } from './providers/HuggingFaceProvider.js';
import { OllamaProvider } from './providers/OllamaProvider.js';
import { LocalProvider } from './providers/LocalProvider.js';
function validateApiKey(apiKey, providerName, setupHints) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        const envVarHint = setupHints.envVar
            ? `Set ${setupHints.envVar} environment variable or configure in SecureKeyStore`
            : `Configure in SecureKeyStore or pass as parameter`;
        const urlHint = setupHints.apiKeyUrl
            ? `\n\nGet your API key at: ${setupHints.apiKeyUrl}`
            : '';
        throw new ConfigurationError(`${providerName} API key is required for RAG functionality${urlHint}`, {
            configKey: setupHints.configKey,
            envVar: setupHints.envVar,
            hint: envVarHint,
            apiKeyUrl: setupHints.apiKeyUrl,
        });
    }
    return apiKey.trim();
}
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
async function promptForApiKey() {
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
            }
            else if (apiKey.startsWith('sk-')) {
                logger.info('\n✅ API Key 已設定！');
                logger.info('   💡 建議：將此 key 加入 .env 檔案以長期使用\n');
                resolve(apiKey);
            }
            else {
                logger.info('\n❌ 無效的 API Key 格式（應該以 "sk-" 開頭）\n');
                resolve(null);
            }
        });
    });
}
export class EmbeddingProviderFactory {
    static async create(config) {
        switch (config.provider) {
            case 'openai': {
                const rawApiKey = config.apiKey || SecureKeyStore.get('openai') || process.env.OPENAI_API_KEY;
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
                const isAvailable = await provider.checkAvailability();
                if (!isAvailable) {
                    throw new ConfigurationError(`Ollama is not running at ${baseUrl}.\n\n` +
                        'Please start Ollama: ollama serve\n' +
                        'And ensure your model is pulled: ollama pull ' + (config.model || 'nomic-embed-text'), {
                        provider: 'Ollama',
                        baseUrl,
                    });
                }
                return provider;
            }
            case 'local': {
                if (!config.modelPath) {
                    throw new ConfigurationError('Model path is required for local embedding provider.\n\n' +
                        'Please provide the path to a downloaded transformers.js model.', {
                        provider: 'Local',
                        configKey: 'modelPath',
                    });
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
                throw new ConfigurationError(`Unsupported embedding provider: ${config.provider}`, {
                    provider: config.provider,
                    supportedProviders: ['openai', 'huggingface', 'ollama', 'local'],
                });
            }
        }
    }
    static async createOpenAI(options = {}) {
        let rawApiKey = options.apiKey || SecureKeyStore.get('openai') || process.env.OPENAI_API_KEY;
        if (!rawApiKey && options.interactive) {
            rawApiKey = await promptForApiKey() || undefined;
            if (rawApiKey) {
                SecureKeyStore.set('openai', rawApiKey);
            }
        }
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
        throw new ConfigurationError('OpenAI service is not available with the provided API key.\n\n' +
            'Please verify your API key at: https://platform.openai.com/api-keys', {
            configKey: 'OPENAI_API_KEY',
            provider: 'OpenAI',
            interactive: options.interactive,
            apiKeyUrl: 'https://platform.openai.com/api-keys',
        });
    }
    static createSync(options = {}) {
        const rawApiKey = options.apiKey || SecureKeyStore.get('openai') || process.env.OPENAI_API_KEY;
        if (options.optional && (!rawApiKey || typeof rawApiKey !== 'string' || rawApiKey.trim().length === 0)) {
            logger.info('RAG features disabled (no OpenAI API key configured)');
            return null;
        }
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
        throw new ConfigurationError('OpenAI service is not available with the provided API key.\n\n' +
            'Please verify your API key at: https://platform.openai.com/api-keys', {
            configKey: 'OPENAI_API_KEY',
            provider: 'OpenAI',
            method: 'createSync',
            apiKeyUrl: 'https://platform.openai.com/api-keys',
        });
    }
    static isAvailable() {
        return new EmbeddingService().isAvailable();
    }
}
//# sourceMappingURL=embedding-provider.js.map