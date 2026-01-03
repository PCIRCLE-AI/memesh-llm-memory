import { IEmbeddingProvider, ModelInfo } from '../types';
export interface LocalProviderOptions {
    modelPath: string;
    model?: string;
    dimensions?: number;
    maxTokens?: number;
    cacheEnabled?: boolean;
    maxCacheSize?: number;
}
export declare class LocalProvider implements IEmbeddingProvider {
    private modelPath;
    private model;
    private dimensions;
    private maxTokens;
    private cacheEnabled;
    private embeddingCache;
    private maxCacheSize;
    private modelInstance;
    private initializationPromise;
    constructor(options: LocalProviderOptions);
    private initializeModel;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    getModelInfo(): ModelInfo;
    private addToCache;
    clearCache(): void;
    getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate: number;
    };
    dispose(): Promise<void>;
}
//# sourceMappingURL=LocalProvider.d.ts.map