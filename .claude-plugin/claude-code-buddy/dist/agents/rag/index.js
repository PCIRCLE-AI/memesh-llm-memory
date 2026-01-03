import { VectorStore } from './vectorstore.js';
import { EmbeddingProviderFactory } from './embedding-provider.js';
import { Reranker } from './reranker.js';
import { StateError, ConfigurationError } from '../../errors/index.js';
import { logger } from '../../utils/logger.js';
export class RAGAgent {
    vectorStore;
    embeddings;
    reranker;
    isInitialized = false;
    constructor() {
        this.vectorStore = new VectorStore();
        this.embeddings = this.tryCreateDefaultProvider();
        this.reranker = new Reranker();
    }
    tryCreateDefaultProvider() {
        return null;
    }
    isRAGEnabled() {
        return this.embeddings !== null;
    }
    async enableRAG(providerConfig) {
        if (this.embeddings !== null) {
            logger.info('✅ RAG features are already enabled');
            return true;
        }
        try {
            if (typeof providerConfig === 'string') {
                this.embeddings = await EmbeddingProviderFactory.create({
                    provider: 'openai',
                    apiKey: providerConfig,
                });
            }
            else if (!providerConfig) {
                const apiKey = process.env.OPENAI_API_KEY;
                if (!apiKey) {
                    throw new Error('OPENAI_API_KEY environment variable not set');
                }
                this.embeddings = await EmbeddingProviderFactory.create({
                    provider: 'openai',
                    apiKey,
                });
            }
            else {
                this.embeddings = await EmbeddingProviderFactory.create(providerConfig);
            }
            const modelInfo = this.embeddings.getModelInfo();
            logger.info(`✅ RAG features enabled successfully with ${modelInfo.provider} (${modelInfo.model})`);
            return true;
        }
        catch (error) {
            logger.error('❌ Failed to enable RAG features:', error);
            return false;
        }
    }
    async initialize() {
        if (this.isInitialized) {
            logger.info('RAG Agent already initialized');
            return;
        }
        logger.info('Initializing RAG Agent...');
        await this.vectorStore.initialize();
        const isHealthy = await this.vectorStore.healthCheck();
        if (!isHealthy) {
            throw new StateError('Vector store health check failed during RAG Agent initialization', {
                component: 'RAGAgent',
                operation: 'initialize',
                vectorStoreStatus: 'unhealthy',
            });
        }
        this.isInitialized = true;
        logger.info('RAG Agent initialized successfully');
        await this.printStats();
    }
    async indexDocument(content, metadata, id) {
        this.ensureInitialized();
        this.ensureRAGEnabled();
        const embedding = await this.embeddings.embed(content);
        await this.vectorStore.addDocument({
            id,
            content,
            metadata,
            embedding,
        });
        logger.info(`Document indexed: ${metadata.source}`);
    }
    async indexDocuments(documents, options = {}) {
        this.ensureInitialized();
        this.ensureRAGEnabled();
        const batchSize = options.batchSize || 100;
        const maxConcurrent = options.maxConcurrent || 5;
        const onProgress = options.onProgress;
        logger.info(`Indexing ${documents.length} documents...`);
        logger.info(`Batch size: ${batchSize}, Max concurrent: ${maxConcurrent}`);
        const startTime = Date.now();
        let processedCount = 0;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            const contents = batch.map((d) => d.content);
            const embeddings = await this.embeddings.embedBatch(contents);
            const docsToAdd = batch.map((doc, index) => ({
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata,
                embedding: embeddings[index],
            }));
            await this.vectorStore.addDocuments(docsToAdd);
            processedCount += batch.length;
            if (onProgress) {
                onProgress(processedCount, documents.length);
            }
            logger.info(`Progress: ${processedCount}/${documents.length} documents`);
        }
        const duration = (Date.now() - startTime) / 1000;
        const totalTokens = 0;
        const totalCost = 0;
        const stats = {
            totalDocuments: documents.length,
            totalTokens,
            totalCost,
            averageTokensPerDocument: totalTokens > 0 ? Math.round(totalTokens / documents.length) : 0,
        };
        logger.info('\n=== Indexing Complete ===');
        logger.info(`Total documents: ${stats.totalDocuments}`);
        logger.info(`Total tokens: ${stats.totalTokens.toLocaleString()}`);
        logger.info(`Total cost: $${stats.totalCost.toFixed(4)}`);
        logger.info(`Avg tokens/doc: ${stats.averageTokensPerDocument}`);
        logger.info(`Duration: ${duration.toFixed(2)}s`);
        logger.info(`Throughput: ${(documents.length / duration).toFixed(2)} docs/sec`);
        return stats;
    }
    async search(query, options = {}) {
        this.ensureInitialized();
        this.ensureRAGEnabled();
        logger.info(`Searching: "${query}"`);
        const queryEmbedding = await this.embeddings.embed(query);
        const results = await this.vectorStore.searchWithEmbedding(queryEmbedding, options);
        logger.info(`Found ${results.length} results`);
        return results;
    }
    async hybridSearch(query, options = {}) {
        this.ensureInitialized();
        const semanticWeight = options.semanticWeight || 0.7;
        const keywordWeight = options.keywordWeight || 0.3;
        const keywords = options.keywords || this.extractKeywords(query);
        logger.info(`Hybrid search: "${query}"`);
        logger.info(`Keywords: ${keywords.join(', ')}`);
        const semanticResults = await this.search(query, {
            topK: (options.topK || 10) * 2,
        });
        const keywordBoostedResults = this.reranker.keywordBoost(semanticResults, keywords);
        const hybridResults = keywordBoostedResults.map((result) => ({
            ...result,
            score: result.score * semanticWeight + result.score * keywordWeight,
        }));
        const topK = options.topK || 5;
        const finalResults = hybridResults
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        logger.info(`Hybrid search complete: ${finalResults.length} results`);
        return finalResults;
    }
    async searchWithRerank(query, options = {}) {
        this.ensureInitialized();
        const results = await this.search(query, {
            ...options,
            topK: (options.topK || 10) * 2,
        });
        const rerankedResults = this.reranker.rerank(results, query, {
            algorithm: options.rerankAlgorithm || 'reciprocal-rank',
        });
        const dedupedResults = this.reranker.deduplicate(rerankedResults);
        const diverseResults = this.reranker.diversityRerank(dedupedResults);
        const topK = options.topK || 5;
        return diverseResults.slice(0, topK);
    }
    async getStats() {
        this.ensureInitialized();
        this.ensureRAGEnabled();
        const documentCount = await this.vectorStore.count();
        const totalTokens = 0;
        const totalCost = 0;
        const collectionInfo = await this.vectorStore.getCollectionInfo();
        const embeddingStats = {
            totalDocuments: documentCount,
            totalTokens,
            totalCost,
            averageTokensPerDocument: documentCount > 0 && totalTokens > 0 ? Math.round(totalTokens / documentCount) : 0,
        };
        return {
            documentCount,
            embeddingStats,
            collectionInfo,
        };
    }
    async deleteDocuments(ids) {
        this.ensureInitialized();
        await this.vectorStore.delete(ids);
        logger.info(`Deleted ${ids.length} documents`);
    }
    async clearAll() {
        this.ensureInitialized();
        await this.vectorStore.clear();
        this.reranker.clearCache();
        logger.info('All documents cleared');
    }
    async close() {
        await this.vectorStore.close();
        this.isInitialized = false;
        logger.info('RAG Agent closed');
    }
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new StateError('RAG Agent not initialized. Call initialize() first.', {
                component: 'RAGAgent',
                operation: 'ensureInitialized',
                isInitialized: false,
            });
        }
    }
    ensureRAGEnabled() {
        if (this.embeddings === null) {
            throw new ConfigurationError('RAG features are not enabled. Please configure an embedding provider.\n\n' +
                'Use enableRAG() method with one of the following:\n' +
                '  - OpenAI: await ragAgent.enableRAG({ provider: "openai", apiKey: "sk-..." })\n' +
                '  - Hugging Face: await ragAgent.enableRAG({ provider: "huggingface", apiKey: "hf_..." })\n' +
                '  - Ollama: await ragAgent.enableRAG({ provider: "ollama", baseUrl: "http://localhost:11434" })\n' +
                '  - Local: await ragAgent.enableRAG({ provider: "local", modelPath: "/path/to/model" })\n\n' +
                'Or set OPENAI_API_KEY environment variable for auto-configuration.\n' +
                'Get OpenAI API key at: https://platform.openai.com/api-keys', {
                configKey: 'EMBEDDING_PROVIDER',
                component: 'RAGAgent',
                supportedProviders: ['openai', 'huggingface', 'ollama', 'local'],
                defaultProvider: 'openai',
                apiKeyUrl: 'https://platform.openai.com/api-keys',
            });
        }
    }
    extractKeywords(query) {
        const stopWords = new Set(['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一個', '上', '也', '很', '到', '說', '要', '去', '你', '會', '著', '沒有', '看', '好', '自己', '這']);
        const words = query
            .split(/[\s,，。、]+/)
            .filter((word) => word.length > 1 && !stopWords.has(word));
        return words;
    }
    async printStats() {
        if (!this.isRAGEnabled()) {
            logger.info('\n=== RAG Agent Status ===');
            logger.info('RAG features: ❌ Disabled (no OpenAI API key)');
            logger.info('Tip: Use enableRAG() to enable RAG features');
            logger.info('========================\n');
            return;
        }
        const stats = await this.getStats();
        const modelInfo = this.embeddings.getModelInfo();
        logger.info('\n=== RAG Agent Status ===');
        logger.info(`Collection: ${stats.collectionInfo.name}`);
        logger.info(`Documents: ${stats.documentCount}`);
        logger.info(`Embedding provider: ${modelInfo.provider}`);
        logger.info(`Embedding model: ${modelInfo.model}`);
        logger.info(`Embedding dimension: ${modelInfo.dimensions}`);
        logger.info('========================\n');
    }
}
let ragAgentInstance = null;
export async function getRAGAgent() {
    if (!ragAgentInstance) {
        ragAgentInstance = new RAGAgent();
        await ragAgentInstance.initialize();
        const ragEnabled = process.env.RAG_ENABLED === 'true';
        if (ragEnabled && !ragAgentInstance.isRAGEnabled()) {
            const embeddingProvider = process.env.EMBEDDING_PROVIDER || 'openai';
            try {
                if (embeddingProvider === 'huggingface') {
                    const apiKey = process.env.HUGGINGFACE_API_KEY;
                    const model = process.env.HUGGINGFACE_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
                    if (apiKey) {
                        logger.info('[RAG] Auto-enabling with HuggingFace provider...');
                        await ragAgentInstance.enableRAG({
                            provider: 'huggingface',
                            apiKey,
                            model,
                        });
                        logger.info('[RAG] ✅ Enabled with HuggingFace (free)');
                    }
                    else {
                        logger.info('[RAG] ⚠️  RAG_ENABLED=true but HUGGINGFACE_API_KEY not set');
                    }
                }
                else if (embeddingProvider === 'openai') {
                    const apiKey = process.env.OPENAI_API_KEY;
                    const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
                    if (apiKey) {
                        logger.info('[RAG] Auto-enabling with OpenAI provider...');
                        await ragAgentInstance.enableRAG({
                            provider: 'openai',
                            apiKey,
                            model,
                        });
                        logger.info('[RAG] ✅ Enabled with OpenAI');
                    }
                    else {
                        logger.info('[RAG] ⚠️  RAG_ENABLED=true but OPENAI_API_KEY not set');
                    }
                }
                else {
                    logger.info(`[RAG] ⚠️  Unknown EMBEDDING_PROVIDER: ${embeddingProvider}`);
                }
            }
            catch (error) {
                logger.info('[RAG] ❌ Failed to auto-enable RAG:', error);
            }
        }
    }
    return ragAgentInstance;
}
export { VectorStore, EmbeddingProviderFactory, Reranker };
export { FileWatcher } from './FileWatcher.js';
//# sourceMappingURL=index.js.map