export declare class EmbeddingService {
    private static readonly DIMENSIONS;
    private static readonly MODEL_NAME;
    private extractor;
    private initialized;
    initialize(): Promise<void>;
    isInitialized(): boolean;
    encode(text: string): Promise<Float32Array>;
    encodeBatch(texts: string[]): Promise<Float32Array[]>;
    cosineSimilarity(a: Float32Array, b: Float32Array): number;
    getDimensions(): number;
    dispose(): Promise<void>;
}
export declare class LazyEmbeddingService {
    private static instance;
    private static initPromise;
    static get(): Promise<EmbeddingService>;
    static dispose(): Promise<void>;
}
//# sourceMappingURL=EmbeddingService.d.ts.map