export declare const HEALTH_CHECK: {
    readonly MAX_QUERY_TIME_MS: 100;
    readonly MAX_DATABASE_SIZE_MB: 1024;
    readonly CHECK_INTERVAL_MS: 5000;
    readonly FAILURE_THRESHOLD: 3;
};
export declare const ENCRYPTION: {
    readonly KEY_SIZES: readonly [128, 192, 256];
    readonly DEFAULT_KEY_SIZE: 256;
    readonly ALGORITHM: "aes-256-gcm";
    readonly IV_LENGTH: 16;
    readonly AUTH_TAG_LENGTH: 16;
};
export declare const TIME: {
    readonly MS_PER_SECOND: 1000;
    readonly MS_PER_MINUTE: number;
    readonly MS_PER_HOUR: number;
    readonly MS_PER_DAY: number;
    readonly MS_PER_WEEK: number;
    readonly MS_PER_MONTH: number;
};
export declare const VALIDATION: {
    readonly MAX_SERVICE_NAME_LENGTH: 255;
    readonly MAX_ACCOUNT_NAME_LENGTH: 255;
    readonly MAX_METADATA_SIZE_BYTES: 10240;
    readonly MAX_NOTES_LENGTH: 1000;
    readonly MAX_TAGS_COUNT: 20;
};
export declare const RATE_LIMIT: {
    readonly DEFAULT_OPS_PER_MINUTE: 60;
    readonly MAX_FAILED_ATTEMPTS: 5;
    readonly LOCKOUT_DURATION_MS: number;
};
export declare const ROTATION: {
    readonly DEFAULT_ROTATION_DAYS: 90;
    readonly EXPIRY_WARNING_DAYS: 7;
    readonly GRACE_PERIOD_DAYS: 3;
};
export declare const AUDIT: {
    readonly DEFAULT_RETENTION_DAYS: 365;
    readonly BATCH_SIZE: 1000;
    readonly MAX_SEARCH_RESULTS: 10000;
};
export declare const DATABASE: {
    readonly JOURNAL_MODE: "WAL";
    readonly FOREIGN_KEYS: "ON";
    readonly BUSY_TIMEOUT_MS: 5000;
};
export declare const MULTI_TENANT: {
    readonly VALIDATION_CACHE_TTL_MS: 60000;
    readonly DEFAULT_CREDENTIAL_QUOTA: 1000;
    readonly DEFAULT_STORAGE_QUOTA_BYTES: number;
    readonly DEFAULT_API_CALLS_PER_HOUR: 1000;
};
//# sourceMappingURL=constants.d.ts.map