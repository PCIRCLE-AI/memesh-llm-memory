export interface JsonParseResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}
export declare function safeJsonParse<T>(jsonString: string | null, fallback: T): T;
export declare function tryParseJson<T>(jsonString: string | null): JsonParseResult<T>;
export declare function parseAndValidate<T>(jsonString: string | null, validator: (data: unknown) => data is T, fallback: T): T;
export declare function isObject(value: unknown): value is Record<string, unknown>;
export declare function isArray(value: unknown): value is unknown[];
export declare function isStringArray(value: unknown): value is string[];
export declare function safeJsonStringify(value: unknown, fallback?: string): string;
//# sourceMappingURL=json.d.ts.map