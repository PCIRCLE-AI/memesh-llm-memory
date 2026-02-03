export class CloudEvolutionClient {
    _config;
    constructor(config) {
        this._config = {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl || 'https://api.memesh.ai',
            timeout: config.timeout || 10000,
        };
    }
    async detectCorrectionAdvanced(_userMessage, _conversation) {
        throw new Error('CloudEvolutionClient: Implementation not available in open source version');
    }
    async recognizePatterns(_mistakes) {
        throw new Error('CloudEvolutionClient: Implementation not available in open source version');
    }
    async getPreventionSuggestions(_context) {
        throw new Error('CloudEvolutionClient: Implementation not available in open source version');
    }
    async getGlobalPatterns() {
        throw new Error('CloudEvolutionClient: Implementation not available in open source version');
    }
    async syncMistakes(_mistakes) {
        throw new Error('CloudEvolutionClient: Implementation not available in open source version');
    }
    async checkHealth() {
        throw new Error('CloudEvolutionClient: Implementation not available in open source version');
    }
}
export function createCloudClient(apiKey) {
    if (!apiKey) {
        return null;
    }
    return new CloudEvolutionClient({ apiKey });
}
//# sourceMappingURL=CloudEvolutionClient.js.map