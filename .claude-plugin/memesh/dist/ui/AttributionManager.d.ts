import type { AttributionMessage, GitHubIssueSuggestion } from './types.js';
import { UIEventBus } from './UIEventBus.js';
export declare class AttributionManager {
    private attributions;
    private readonly maxStoredAttributions;
    private eventBus;
    constructor(eventBus: UIEventBus);
    recordSuccess(agentIds: string[], taskDescription: string, metadata?: {
        timeSaved?: number;
        tokensUsed?: number;
    }): void;
    recordError(agentIds: string[], taskDescription: string, error: Error, suggestGitHubIssue?: boolean): void;
    generateIssueSuggestion(attribution: AttributionMessage, error: Error): GitHubIssueSuggestion;
    getRecentAttributions(limit?: number): AttributionMessage[];
    private storeAttribution;
    private sanitizeSensitiveData;
    private generateId;
}
//# sourceMappingURL=AttributionManager.d.ts.map