import { QuotaManager } from '../quota/manager.js';
export interface Task {
    type: 'code' | 'text' | 'image' | 'audio' | 'video' | 'reasoning' | 'creative';
    complexity: number;
    content: string;
    preferredProvider?: string;
}
export interface ModelSelection {
    provider: string;
    model: string;
    reason: string;
    fallback?: ModelSelection;
}
export declare class SmartRouter {
    private quotaManager;
    constructor(quotaManager: QuotaManager);
    selectModel(task: Task): ModelSelection;
    private getPreferredProvider;
    private getModelForProvider;
    private getOllamaModel;
    getAvailableProviders(): string[];
    getUsageStats(): Record<string, import("../quota/manager.js").ProviderQuota>;
}
//# sourceMappingURL=router.d.ts.map