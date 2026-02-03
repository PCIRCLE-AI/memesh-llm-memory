import { logger } from '../utils/logger.js';
const PREFERENCE_PREFIX = 'user-preference-';
const PREFERENCE_TAG = 'user-preference';
const PREFERENCE_METADATA_KEY = 'preferenceData';
export class UserPreferenceEngine {
    memoryStore;
    constructor(memoryStore) {
        this.memoryStore = memoryStore;
    }
    async storePreference(preference) {
        try {
            const memoryId = await this.memoryStore.store({
                type: 'user-preference',
                content: this.preferenceToContent(preference),
                context: `User Preference: ${preference.category}`,
                tags: [PREFERENCE_TAG, `category:${preference.category}`],
                importance: this.confidenceToImportance(preference.confidence),
                timestamp: new Date(),
                metadata: {
                    [PREFERENCE_METADATA_KEY]: preference,
                },
            }, {
                projectPath: process.cwd(),
            });
            logger.debug(`Stored preference: ${preference.category} (ID: ${memoryId})`);
        }
        catch (error) {
            logger.error('Failed to store preference:', error);
            throw error;
        }
    }
    async getAllPreferences() {
        try {
            const memories = await this.memoryStore.searchByTags([PREFERENCE_TAG]);
            return memories.map((m) => this.memoryToPreference(m)).filter((p) => p !== null);
        }
        catch (error) {
            logger.error('Failed to get all preferences:', error);
            return [];
        }
    }
    async getPreferencesByCategory(category) {
        try {
            const allPreferences = await this.getAllPreferences();
            return allPreferences.filter((p) => p.category === category);
        }
        catch (error) {
            logger.error(`Failed to get preferences by category ${category}:`, error);
            return [];
        }
    }
    async getStatistics() {
        try {
            const preferences = await this.getAllPreferences();
            const byCategory = {};
            const byConfidence = {};
            for (const pref of preferences) {
                byCategory[pref.category] = (byCategory[pref.category] ?? 0) + 1;
                byConfidence[pref.confidence] = (byConfidence[pref.confidence] ?? 0) + 1;
            }
            return {
                totalPreferences: preferences.length,
                byCategory: byCategory,
                byConfidence: byConfidence,
            };
        }
        catch (error) {
            logger.error('Failed to get statistics:', error);
            return {
                totalPreferences: 0,
                byCategory: {},
                byConfidence: {},
            };
        }
    }
    preferenceToContent(preference) {
        const parts = [];
        if (preference.likes.length > 0) {
            parts.push(`Likes: ${preference.likes.join(', ')}`);
        }
        if (preference.dislikes.length > 0) {
            parts.push(`Dislikes: ${preference.dislikes.join(', ')}`);
        }
        if (preference.rules.length > 0) {
            parts.push(`Rules: ${preference.rules.join('; ')}`);
        }
        return parts.join('\n');
    }
    memoryToPreference(memory) {
        try {
            const preferenceData = memory.metadata?.[PREFERENCE_METADATA_KEY];
            if (!preferenceData) {
                logger.warn('Memory missing preference data');
                return null;
            }
            return preferenceData;
        }
        catch (error) {
            logger.error('Failed to convert memory to preference:', error);
            return null;
        }
    }
    confidenceToImportance(confidence) {
        switch (confidence) {
            case 'low':
                return 3;
            case 'medium':
                return 6;
            case 'high':
                return 9;
            default:
                return 5;
        }
    }
}
//# sourceMappingURL=UserPreferenceEngine.js.map