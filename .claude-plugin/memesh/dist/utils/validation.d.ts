export declare function validateFiniteNumber(value: number, name: string, options?: {
    min?: number;
    max?: number;
}): void;
export declare function validateSafeInteger(value: number, name: string): void;
export declare function validatePercentage(value: number, name: string): void;
export declare function validateNormalized(value: number, name: string): void;
export declare function validateNonEmptyString(value: string, name: string): void;
export declare function validateEnum<T extends string>(value: string, name: string, allowedValues: readonly T[]): asserts value is T;
export declare function validateNonEmptyArray<T>(value: unknown, name: string): asserts value is T[];
export declare function validateObjectSize(value: object, name: string, maxBytes: number): void;
//# sourceMappingURL=validation.d.ts.map