/**
 * Safe JSON Parsing Utilities
 *
 * Provides type-safe JSON parsing with proper error handling
 * to prevent crashes from malformed JSON data. Includes validation
 * helpers and type guards for runtime type checking.
 *
 * Features:
 * - Safe parsing with fallback values
 * - Result-based parsing (success/error)
 * - Type validation with custom validators
 * - Type guards for common types
 * - Automatic error logging
 *
 * @example
 * ```typescript
 * import {
 *   safeJsonParse,
 *   tryParseJson,
 *   parseAndValidate,
 *   isObject,
 *   isStringArray
 * } from './json.js';
 *
 * // Safe parsing with fallback
 * const config = safeJsonParse(configString, { timeout: 3000 });
 *
 * // Result-based parsing
 * const result = tryParseJson<User>(userJson);
 * if (result.success) {
 *   console.log('User:', result.data);
 * } else {
 *   console.error('Parse failed:', result.error);
 * }
 *
 * // Parsing with validation
 * const validated = parseAndValidate(
 *   jsonString,
 *   (data): data is User => isObject(data) && typeof data.id === 'number',
 *   { id: 0, name: 'Unknown' }
 * );
 *
 * // Type guards
 * if (isObject(data) && 'users' in data && isStringArray(data.users)) {
 *   // TypeScript now knows data.users is string[]
 *   data.users.forEach(user => console.log(user));
 * }
 * ```
 */

import { logger } from './logger.js';

/**
 * Result object for JSON parsing operations
 *
 * Provides a discriminated union for handling parse results:
 * - success=true: data is defined, error is undefined
 * - success=false: error is defined, data is undefined
 *
 * @template T - Expected type of parsed data
 *
 * @example
 * ```typescript
 * const result: JsonParseResult<User> = tryParseJson(jsonString);
 *
 * if (result.success) {
 *   // TypeScript knows result.data is User
 *   console.log(result.data.name);
 * } else {
 *   // TypeScript knows result.error is string
 *   console.error('Parse error:', result.error);
 * }
 * ```
 */
export interface JsonParseResult<T> {
  /** Whether parsing succeeded */
  success: boolean;
  /** Parsed data (only present if success=true) */
  data?: T;
  /** Error message (only present if success=false) */
  error?: string;
}

/**
 * Safely parse JSON string with error handling
 *
 * Returns fallback value if input is null, empty, or invalid JSON.
 * Logs parse errors with input preview for debugging.
 *
 * @template T - Expected type of parsed data
 * @param jsonString - String to parse (can be null)
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed data or fallback value
 *
 * @example
 * ```typescript
 * // Parsing configuration with default
 * const config = safeJsonParse(
 *   process.env.APP_CONFIG,
 *   { timeout: 3000, retries: 3 }
 * );
 *
 * // Parsing user preferences
 * const prefs = safeJsonParse<UserPreferences>(
 *   localStorage.getItem('preferences'),
 *   { theme: 'light', language: 'en' }
 * );
 *
 * // Always safe - never throws
 * const data = safeJsonParse('invalid json', []); // Returns []
 * ```
 */
export function safeJsonParse<T>(jsonString: string | null, fallback: T): T {
  if (!jsonString) {
    return fallback;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.warn('JSON parse error:', {
      error: error instanceof Error ? error.message : String(error),
      input: jsonString.substring(0, 100), // Log first 100 chars for debugging
    });
    return fallback;
  }
}

/**
 * Parse JSON string and return result object with success/error info
 *
 * Provides explicit success/error information instead of throwing.
 * Useful when you need to handle both success and failure cases explicitly.
 *
 * @template T - Expected type of parsed data
 * @param jsonString - String to parse (can be null)
 * @returns Result object with success flag, data, and optional error
 *
 * @example
 * ```typescript
 * // Explicit error handling
 * const result = tryParseJson<User>(apiResponse);
 * if (result.success) {
 *   console.log('User ID:', result.data.id);
 *   console.log('User name:', result.data.name);
 * } else {
 *   console.error('Failed to parse user:', result.error);
 *   // Handle error case
 * }
 *
 * // Conditional processing
 * const configResult = tryParseJson<AppConfig>(configString);
 * const config = configResult.success
 *   ? configResult.data
 *   : getDefaultConfig();
 *
 * // Type-safe error handling
 * function processJson(json: string): User | null {
 *   const result = tryParseJson<User>(json);
 *   return result.success ? result.data : null;
 * }
 * ```
 */
export function tryParseJson<T>(jsonString: string | null): JsonParseResult<T> {
  if (!jsonString) {
    return {
      success: false,
      error: 'Input is null or empty',
    };
  }

  try {
    const data = JSON.parse(jsonString) as T;
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parse JSON with custom validation function
 *
 * Parses JSON and validates the result using a type guard function.
 * Returns fallback value if parsing fails or validation fails.
 * Logs both parse errors and validation failures.
 *
 * @template T - Expected type of parsed and validated data
 * @param jsonString - String to parse (can be null)
 * @param validator - Type guard function to validate parsed data
 * @param fallback - Fallback value if parsing or validation fails
 * @returns Validated data or fallback value
 *
 * @example
 * ```typescript
 * // User validation
 * function isUser(data: unknown): data is User {
 *   return (
 *     isObject(data) &&
 *     typeof data.id === 'number' &&
 *     typeof data.name === 'string'
 *   );
 * }
 *
 * const user = parseAndValidate(
 *   apiResponse,
 *   isUser,
 *   { id: 0, name: 'Guest' }
 * );
 *
 * // Config validation with complex structure
 * function isConfig(data: unknown): data is AppConfig {
 *   return (
 *     isObject(data) &&
 *     typeof data.apiUrl === 'string' &&
 *     typeof data.timeout === 'number' &&
 *     'features' in data &&
 *     isStringArray(data.features)
 *   );
 * }
 *
 * const config = parseAndValidate(
 *   configJson,
 *   isConfig,
 *   { apiUrl: 'https://api.example.com', timeout: 5000, features: [] }
 * );
 * ```
 */
export function parseAndValidate<T>(
  jsonString: string | null,
  validator: (data: unknown) => data is T,
  fallback: T
): T {
  if (!jsonString) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(jsonString);
    if (validator(parsed)) {
      return parsed;
    } else {
      logger.warn('JSON validation failed:', {
        input: jsonString.substring(0, 100),
      });
      return fallback;
    }
  } catch (error) {
    logger.warn('JSON parse error:', {
      error: error instanceof Error ? error.message : String(error),
      input: jsonString.substring(0, 100),
    });
    return fallback;
  }
}

/**
 * Type guard for checking if value is a non-null object
 *
 * Excludes arrays and null values, returning true only for plain objects.
 * Useful for validating JSON object structures.
 *
 * @param value - Value to check
 * @returns true if value is a non-null, non-array object
 *
 * @example
 * ```typescript
 * const data: unknown = JSON.parse(jsonString);
 *
 * if (isObject(data)) {
 *   // TypeScript knows data is Record<string, unknown>
 *   console.log('Keys:', Object.keys(data));
 *
 *   if ('name' in data && typeof data.name === 'string') {
 *     console.log('Name:', data.name);
 *   }
 * }
 *
 * isObject({ a: 1 });      // true
 * isObject([1, 2, 3]);     // false (arrays excluded)
 * isObject(null);          // false
 * isObject('string');      // false
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value is an array
 *
 * TypeScript type guard that narrows unknown to unknown[].
 * Use with additional checks to validate array element types.
 *
 * @param value - Value to check
 * @returns true if value is an array
 *
 * @example
 * ```typescript
 * const data: unknown = JSON.parse(jsonString);
 *
 * if (isArray(data)) {
 *   // TypeScript knows data is unknown[]
 *   console.log('Array length:', data.length);
 *
 *   // Check element types
 *   if (data.every(item => typeof item === 'number')) {
 *     // Now we know it's a number array
 *     const sum = data.reduce((a, b) => a + b, 0);
 *   }
 * }
 * ```
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard for checking if value is a string array
 *
 * Validates that value is an array AND all elements are strings.
 * More specific than isArray - guarantees string[] type.
 *
 * @param value - Value to check
 * @returns true if value is an array of strings
 *
 * @example
 * ```typescript
 * const data: unknown = JSON.parse(jsonString);
 *
 * if (isStringArray(data)) {
 *   // TypeScript knows data is string[]
 *   data.forEach(str => console.log(str.toUpperCase()));
 *   const joined = data.join(', ');
 * }
 *
 * // Validation examples
 * isStringArray(['a', 'b', 'c']);    // true
 * isStringArray([1, 2, 3]);          // false
 * isStringArray(['a', 1, 'b']);      // false (mixed types)
 * isStringArray([]);                 // true (empty array)
 * isStringArray('not an array');     // false
 * ```
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
