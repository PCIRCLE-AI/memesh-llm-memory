export interface ApiKeyValidationResult {
    isValid: boolean;
    status: 'valid' | 'missing' | 'invalid';
    message?: string;
    guidance?: string;
}
export declare function validateOpenAIKey(apiKey: string | undefined): ApiKeyValidationResult;
export declare function validateAllApiKeys(): boolean;
export declare function isRagAvailable(): boolean;
//# sourceMappingURL=apiKeyValidator.d.ts.map