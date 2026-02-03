export type SecretType = 'api_key' | 'bearer_token' | 'jwt' | 'password' | 'oauth_token' | 'generic';
export interface DetectedSecret {
    type: SecretType;
    value: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
}
export interface StoredSecret {
    id: string;
    name: string;
    secretType: SecretType;
    encryptedValue: string;
    iv: string;
    authTag: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
}
export interface SecretStoreOptions {
    name: string;
    secretType?: SecretType;
    expiresInSeconds?: number;
    metadata?: Record<string, unknown>;
}
export interface SecretConfirmationRequest {
    messageKey: string;
    params: {
        secretName: string;
        maskedValue: string;
        expiresIn: string;
    };
    privacyNoticeKey: string;
}
export interface SecretPattern {
    name: string;
    type: SecretType;
    pattern: RegExp;
    confidence: number;
}
export declare const DEFAULT_SECRET_PATTERNS: SecretPattern[];
//# sourceMappingURL=secret-types.d.ts.map