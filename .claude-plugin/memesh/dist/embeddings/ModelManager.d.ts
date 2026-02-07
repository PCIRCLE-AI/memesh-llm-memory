export declare class ModelManager {
    private static readonly MODEL_NAME;
    private static readonly HUGGINGFACE_REPO;
    private static readonly REQUIRED_FILES;
    private modelDir;
    constructor();
    getModelDir(): string;
    getModelName(): string;
    getHuggingFaceRepo(): string;
    getRequiredFiles(): string[];
    isModelDownloaded(): Promise<boolean>;
    getModelFilePath(filename: string): string;
    ensureModel(): Promise<string>;
    private downloadModel;
    private resolveModelDir;
    private getDataDir;
}
//# sourceMappingURL=ModelManager.d.ts.map