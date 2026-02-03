export declare function safeParseInt(value: string | number | undefined, defaultValue: number, min?: number, max?: number): number;
export declare function safeParseFloat(value: string | number | undefined, defaultValue: number, min?: number, max?: number): number;
export declare function safeDivide(numerator: number, denominator: number, defaultValue?: number): number;
export declare function safeMultiply(a: number, b: number, maxValue?: number): number;
export declare function safeAdd(a: number, b: number, maxValue?: number): number;
export declare function safePercentage(value: number, total: number, decimals?: number): number;
export declare function clamp(value: number, min: number, max: number): number;
export declare function isSafeInteger(value: number): boolean;
export declare function bytesToMB(bytes: number, decimals?: number): number;
export declare function mbToBytes(mb: number): number;
//# sourceMappingURL=safeMath.d.ts.map