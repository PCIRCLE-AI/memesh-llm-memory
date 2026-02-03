import { UnifiedMemoryStore } from './UnifiedMemoryStore.js';
import type { UserPreference, PreferenceCategory, PreferenceConfidence } from './types/preference-types.js';
export declare class UserPreferenceEngine {
    private memoryStore;
    constructor(memoryStore: UnifiedMemoryStore);
    storePreference(preference: UserPreference): Promise<void>;
    getAllPreferences(): Promise<UserPreference[]>;
    getPreferencesByCategory(category: PreferenceCategory): Promise<UserPreference[]>;
    getStatistics(): Promise<{
        totalPreferences: number;
        byCategory: Record<PreferenceCategory, number>;
        byConfidence: Record<PreferenceConfidence, number>;
    }>;
    private preferenceToContent;
    private memoryToPreference;
    private confidenceToImportance;
}
//# sourceMappingURL=UserPreferenceEngine.d.ts.map