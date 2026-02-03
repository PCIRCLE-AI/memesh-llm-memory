export type PreferenceCategory = 'instruction-following' | 'memory-management' | 'efficiency' | 'code-quality' | 'communication' | 'verification' | 'other';
export type PreferenceConfidence = 'low' | 'medium' | 'high';
export interface UserPreference {
    id: string;
    category: PreferenceCategory;
    likes: string[];
    dislikes: string[];
    rules: string[];
    sourceMistakes: string[];
    confidence: PreferenceConfidence;
    createdAt: Date;
    updatedAt?: Date;
}
export interface PreferenceViolation {
    preference: UserPreference;
    violatedRule: string;
    severity: 'warning' | 'error';
    suggestion?: string;
}
export interface PreferencePattern {
    keywords: string[];
    category: PreferenceCategory;
    likes: string[];
    dislikes: string[];
    rules: string[];
    confidence: PreferenceConfidence;
}
//# sourceMappingURL=preference-types.d.ts.map