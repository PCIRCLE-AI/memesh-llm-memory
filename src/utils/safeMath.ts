/**
 * Safe Math Utilities
 *
 * ✅ CODE QUALITY FIX (MAJOR-2): Prevents numeric overflow and NaN issues
 *
 * Provides safe numeric operations with:
 * - NaN detection and handling
 * - Overflow/underflow protection
 * - Safe parsing with validation
 * - Type-safe numeric operations
 *
 * @module utils/safeMath
 */

/**
 * Safe integer parsing with NaN check
 *
 * @param value - Value to parse (string or number)
 * @param defaultValue - Default value if parsing fails
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Parsed integer or default value
 *
 * @example
 * ```typescript
 * safeParseInt('42', 0);           // 42
 * safeParseInt('abc', 0);          // 0
 * safeParseInt('1000', 0, 1, 100); // 100 (clamped to max)
 * safeParseInt('-5', 0, 0, 100);   // 0 (clamped to min)
 * ```
 */
export function safeParseInt(
  value: string | number | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = typeof value === 'number' ? value : parseInt(value, 10);

  // Check for NaN
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }

  // Apply min constraint
  if (min !== undefined && parsed < min) {
    return min;
  }

  // Apply max constraint
  if (max !== undefined && parsed > max) {
    return max;
  }

  return parsed;
}

/**
 * Safe float parsing with NaN check
 *
 * @param value - Value to parse (string or number)
 * @param defaultValue - Default value if parsing fails
 * @param min - Minimum allowed value (optional)
 * @param max - Maximum allowed value (optional)
 * @returns Parsed float or default value
 *
 * @example
 * ```typescript
 * safeParseFloat('3.14', 0);          // 3.14
 * safeParseFloat('abc', 0);           // 0
 * safeParseFloat('100.5', 0, 0, 100); // 100 (clamped to max)
 * ```
 */
export function safeParseFloat(
  value: string | number | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = typeof value === 'number' ? value : parseFloat(value);

  // Check for NaN
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue;
  }

  // Apply min constraint
  if (min !== undefined && parsed < min) {
    return min;
  }

  // Apply max constraint
  if (max !== undefined && parsed > max) {
    return max;
  }

  return parsed;
}

/**
 * Safe division with zero check
 *
 * @param numerator - Numerator
 * @param denominator - Denominator
 * @param defaultValue - Default value if division by zero (default: 0)
 * @returns Result of division or default value
 *
 * @example
 * ```typescript
 * safeDivide(10, 2);      // 5
 * safeDivide(10, 0);      // 0 (default)
 * safeDivide(10, 0, 100); // 100 (custom default)
 * ```
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  defaultValue: number = 0
): number {
  // Check for zero or invalid denominator
  if (denominator === 0 || isNaN(denominator) || !isFinite(denominator)) {
    return defaultValue;
  }

  // Check for invalid numerator
  if (isNaN(numerator) || !isFinite(numerator)) {
    return defaultValue;
  }

  const result = numerator / denominator;

  // Check result is valid
  if (isNaN(result) || !isFinite(result)) {
    return defaultValue;
  }

  return result;
}

/**
 * Safe multiplication with overflow check
 *
 * @param a - First operand
 * @param b - Second operand
 * @param maxValue - Maximum allowed value (default: Number.MAX_SAFE_INTEGER)
 * @returns Result of multiplication or maxValue if overflow
 *
 * @example
 * ```typescript
 * safeMultiply(10, 20);               // 200
 * safeMultiply(1e15, 1e15);           // Number.MAX_SAFE_INTEGER (overflow)
 * safeMultiply(100, 50, 1000);        // 1000 (clamped to max)
 * ```
 */
export function safeMultiply(
  a: number,
  b: number,
  maxValue: number = Number.MAX_SAFE_INTEGER
): number {
  // Check for invalid inputs
  if (isNaN(a) || isNaN(b) || !isFinite(a) || !isFinite(b)) {
    return 0;
  }

  const result = a * b;

  // Check for overflow
  if (!isFinite(result) || result > maxValue) {
    return maxValue;
  }

  // Check for underflow (negative overflow)
  if (result < -maxValue) {
    return -maxValue;
  }

  return result;
}

/**
 * Safe addition with overflow check
 *
 * @param a - First operand
 * @param b - Second operand
 * @param maxValue - Maximum allowed value (default: Number.MAX_SAFE_INTEGER)
 * @returns Result of addition or maxValue if overflow
 *
 * @example
 * ```typescript
 * safeAdd(10, 20);                    // 30
 * safeAdd(1e308, 1e308);              // Number.MAX_SAFE_INTEGER (overflow)
 * safeAdd(100, 50, 120);              // 120 (clamped to max)
 * ```
 */
export function safeAdd(
  a: number,
  b: number,
  maxValue: number = Number.MAX_SAFE_INTEGER
): number {
  // Check for invalid inputs
  if (isNaN(a) || isNaN(b) || !isFinite(a) || !isFinite(b)) {
    return 0;
  }

  const result = a + b;

  // Check for overflow
  if (!isFinite(result) || result > maxValue) {
    return maxValue;
  }

  // Check for underflow
  if (result < -maxValue) {
    return -maxValue;
  }

  return result;
}

/**
 * Safe percentage calculation
 *
 * @param value - Value
 * @param total - Total
 * @param decimals - Number of decimal places (default: 2)
 * @returns Percentage (0-100) or 0 if invalid
 *
 * @example
 * ```typescript
 * safePercentage(50, 200);        // 25.00
 * safePercentage(1, 3);           // 33.33
 * safePercentage(50, 0);          // 0 (avoid division by zero)
 * safePercentage(50, 200, 0);     // 25
 * ```
 */
export function safePercentage(
  value: number,
  total: number,
  decimals: number = 2
): number {
  const result = safeDivide(value, total, 0) * 100;

  // Round to specified decimals
  const multiplier = Math.pow(10, decimals);
  return Math.round(result * multiplier) / multiplier;
}

/**
 * Clamp value between min and max
 *
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 *
 * @example
 * ```typescript
 * clamp(50, 0, 100);    // 50
 * clamp(150, 0, 100);   // 100
 * clamp(-10, 0, 100);   // 0
 * ```
 */
export function clamp(value: number, min: number, max: number): number {
  if (isNaN(value) || !isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}

/**
 * Check if value is a safe integer
 *
 * @param value - Value to check
 * @returns True if value is a safe integer
 *
 * @example
 * ```typescript
 * isSafeInteger(42);                    // true
 * isSafeInteger(1.5);                   // false
 * isSafeInteger(Number.MAX_SAFE_INTEGER + 1); // false
 * ```
 */
export function isSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value);
}

/**
 * Convert bytes to megabytes safely
 *
 * @param bytes - Bytes value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Megabytes or 0 if invalid
 *
 * @example
 * ```typescript
 * bytesToMB(1048576);      // 1.00
 * bytesToMB(1572864);      // 1.50
 * bytesToMB(1048576, 0);   // 1
 * ```
 */
export function bytesToMB(bytes: number, decimals: number = 2): number {
  return safeParseFloat(
    safeDivide(bytes, 1024 * 1024, 0).toFixed(decimals),
    0,
    0
  );
}

/**
 * Convert megabytes to bytes safely
 *
 * @param mb - Megabytes value
 * @returns Bytes or 0 if invalid
 *
 * @example
 * ```typescript
 * mbToBytes(1);      // 1048576
 * mbToBytes(1.5);    // 1572864
 * mbToBytes(0);      // 0
 * ```
 */
export function mbToBytes(mb: number): number {
  return Math.floor(safeMultiply(mb, 1024 * 1024));
}
